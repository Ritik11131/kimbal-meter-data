import { createProfileRepository } from "../repositories/profile.repository"
import { createEntityRepository } from "../repositories/entity.repository"
import { createEntityService } from "./entity.service"
import type { Profile, CreateProfileDTO, UpdateProfileDTO } from "../types/entities"
import type { ProfileHierarchyResponse } from "../types/search"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { isRootAdmin } from "../utils/rootAdmin"

export const createProfileService = () => {
  const profileRepository = createProfileRepository()
  const entityRepository = createEntityRepository()
  const entityService = createEntityService()

  /**
   * Retrieves a profile by ID and validates access
   * @param id - Profile ID
   * @param user - Authenticated user context
   * @returns Profile object
   */
  const getProfileById = async (id: string, user: AuthContext): Promise<Profile> => {
    const profile = await profileRepository.findById(id)
    if (!profile) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (profile.entity_id === null) {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can access global profiles", HTTP_STATUS.FORBIDDEN)
      }
    } else {
      await validateEntityAccess(user.entityId, profile.entity_id, "profile")
    }

    return profile
  }

  /**
   * Creates a new profile
   * @param data - Profile creation data
   * @param user - Authenticated user context
   * @returns Created profile
   */
  const createProfile = async (data: CreateProfileDTO, user: AuthContext): Promise<Profile> => {
    try {
      if (data.entity_id === null || data.entity_id === undefined) {
        const isRoot = await isRootAdmin(user.entityId)
        if (!isRoot) {
          throw new AppError("Only root admin can create global profiles", HTTP_STATUS.FORBIDDEN)
        }
      } else {
        await validateEntityAccess(user.entityId, data.entity_id, "profiles")
      }

      return await profileRepository.createProfile(data, user.userId)
    } catch (error) {
      logger.error("Error creating profile:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Updates an existing profile
   * @param id - Profile ID
   * @param data - Profile update data
   * @param user - Authenticated user context
   * @returns Updated profile
   */
  const updateProfile = async (
    id: string,
    data: UpdateProfileDTO,
    user: AuthContext
  ): Promise<Profile> => {
    try {
      await getProfileById(id, user)
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

  /**
   * Deletes a profile
   * @param id - Profile ID
   * @param user - Authenticated user context
   */
  const deleteProfile = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getProfileById(id, user)
      
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

  /**
   * Lists profiles with pagination and optional entity filter
   * @param entityId - Optional entity ID filter (null for global profiles)
   * @param user - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated profile list
   */
  const listProfiles = async (
    entityId: string | null | undefined,
    user: AuthContext,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: Profile[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      let accessibleEntityIds: string[] | undefined

      if (entityId === null || entityId === undefined) {
        if (isRoot) {
          accessibleEntityIds = undefined
        } else {
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
        }
        const { data, total } = await profileRepository.paginateProfiles(page, limit, undefined, accessibleEntityIds, search)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      } else {
        if (entityId === "null" || entityId === "") {
          if (!isRoot) {
            throw new AppError("Only root admin can view global profiles", HTTP_STATUS.FORBIDDEN)
          }
          const { data, total } = await profileRepository.paginateProfiles(page, limit, null, undefined, search)
          return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          }
        } else {
          const { data, total } = await profileRepository.paginateProfiles(page, limit, entityId, undefined, search)
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

  /**
   * Gets profile hierarchy starting from logged-in user's entity
   * @param profileId - Profile ID
   * @param user - Authenticated user context
   * @param options - Optional depth for entity hierarchy
   * @returns Profile hierarchy response with entity hierarchy from user's entity
   */
  const getProfileHierarchyFromUserEntity = async (
    profileId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<ProfileHierarchyResponse> => {
    try {
      const profile = await getProfileById(profileId, user)

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      let entityHierarchy = undefined

      // If profile has an entity, get hierarchy from user's entity to profile's entity
      if (profile.entity_id) {
        await validateEntityAccess(user.entityId, profile.entity_id, "entity")
        const hierarchy = await entityService.getEntityHierarchy(user.entityId, user, { depth: options?.depth })
        entityHierarchy = entityService.markSelectedEntity(hierarchy, profile.entity_id)
      }

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "profile",
          id: profile.id,
          name: profile.name,
          entityId: profile.entity_id,
        },
        profile,
        entityHierarchy,
      }
    } catch (error) {
      logger.error("Error fetching profile hierarchy:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Gets profile hierarchy (legacy method - kept for backward compatibility)
   * @param profileId - Profile ID
   * @param user - Authenticated user context
   * @param options - Optional depth for entity hierarchy
   * @returns Profile with entity hierarchy
   */
  const getProfileHierarchy = async (
    profileId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<any> => {
    const result = await getProfileHierarchyFromUserEntity(profileId, user, options)
    return {
      ...result.profile,
      entity: result.entityHierarchy,
    }
  }

  return {
    getProfileById,
    createProfile,
    updateProfile,
    deleteProfile,
    listProfiles,
    getProfileHierarchy,
    getProfileHierarchyFromUserEntity,
  }
}

