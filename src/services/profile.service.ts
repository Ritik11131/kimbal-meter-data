import { createProfileRepository } from "../repositories/profile.repository"
import { createEntityRepository } from "../repositories/entity.repository"
import type { Profile, CreateProfileDTO, UpdateProfileDTO } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { isRootAdmin } from "../utils/rootAdmin"

export const createProfileService = () => {
  const profileRepository = createProfileRepository()
  const entityRepository = createEntityRepository()

  const getProfileById = async (id: string, user: AuthContext): Promise<Profile> => {
    const profile = await profileRepository.findById(id)
    if (!profile) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    // Global profiles (entity_id = null) - only root admin can access
    if (profile.entity_id === null) {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can access global profiles", HTTP_STATUS.FORBIDDEN)
      }
    } else {
      // Entity-scoped profiles - validate entity access
      await validateEntityAccess(user.entityId, profile.entity_id, "profile")
    }

    return profile
  }

  const createProfile = async (data: CreateProfileDTO, user: AuthContext): Promise<Profile> => {
    try {
      // Global profiles - only root admin can create
      if (data.entity_id === null || data.entity_id === undefined) {
        const isRoot = await isRootAdmin(user.entityId)
        if (!isRoot) {
          throw new AppError("Only root admin can create global profiles", HTTP_STATUS.FORBIDDEN)
        }
      } else {
        // Entity-scoped profiles - validate entity access
        await validateEntityAccess(user.entityId, data.entity_id, "profiles")
      }

      return await profileRepository.createProfile(data, user.userId)
    } catch (error) {
      logger.error("Error creating profile:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const updateProfile = async (
    id: string,
    data: UpdateProfileDTO,
    user: AuthContext
  ): Promise<Profile> => {
    try {
      await getProfileById(id, user) // This validates access
      const updated = await profileRepository.updateProfile(id, data)
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      return updated
    } catch (error) {
      logger.error("Error updating profile:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const deleteProfile = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getProfileById(id, user) // This validates access
      
      // Check if profile is assigned to any entities
      const entitiesWithProfile = await entityRepository.findByProfileId(id)
      if (entitiesWithProfile.length > 0) {
        throw new AppError(
          `Cannot delete profile: Profile is assigned to ${entitiesWithProfile.length} entity/entities. Please reassign entities to another profile first.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
      
      await profileRepository.delete(id)
    } catch (error) {
      logger.error("Error deleting profile:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const listProfiles = async (
    entityId: string | null | undefined,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Profile[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      let accessibleEntityIds: string[] | undefined

      // Handle null/undefined - list all accessible profiles
      if (entityId === null || entityId === undefined) {
        // List all profiles user can access
        if (isRoot) {
          // Root admin can see all profiles (global + all entity-scoped)
          logger.debug("listProfiles: Root admin - returning all profiles")
          accessibleEntityIds = undefined // No filter
        } else {
          // Non-root users can only see profiles from their accessible hierarchy
          // Global profiles are NOT accessible to non-root users (security: root-only)
          logger.debug(`listProfiles: Non-root user - returning only accessible entity profiles from hierarchy`)
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
        }
        const { data, total } = await profileRepository.paginateProfiles(page, limit, undefined, accessibleEntityIds)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      } else {
        // List profiles for specific entity
        // Check if requesting global profiles (entityId is explicitly "null" string or special value)
        if (entityId === "null" || entityId === "") {
          // Global profiles - only root admin
          if (!isRoot) {
            throw new AppError("Only root admin can view global profiles", HTTP_STATUS.FORBIDDEN)
          }
          logger.debug("listProfiles: Returning global profiles only")
          const { data, total } = await profileRepository.paginateProfiles(page, limit, null)
          return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          }
        } else {
          // Entity-scoped profiles - validate access
          logger.debug(`listProfiles: Returning profiles for entity: ${entityId}`)
          await validateEntityAccess(user.entityId, entityId, "profiles")
          const { data, total } = await profileRepository.paginateProfiles(page, limit, entityId)
          return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          }
        }
      }
    } catch (error) {
      logger.error("Error listing profiles:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getProfileById,
    createProfile,
    updateProfile,
    deleteProfile,
    listProfiles,
  }
}

