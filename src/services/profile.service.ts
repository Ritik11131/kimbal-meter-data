import { createProfileRepository } from "../repositories/profile.repository"
import type { Profile, CreateProfileDTO, UpdateProfileDTO } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess } from "../utils/hierarchy"
import { Entity } from "../models/Entity"

/**
 * Check if user is root admin (entity has no parent)
 */
const isRootAdmin = async (userEntityId: string): Promise<boolean> => {
  const entity = await Entity.findByPk(userEntityId)
  if (!entity) return false
  return entity.entity_id === null
}

export const createProfileService = () => {
  const profileRepository = createProfileRepository()

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
      await validateEntityAccess(user.entityId, profile.entity_id)
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
        await validateEntityAccess(user.entityId, data.entity_id)
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
      await profileRepository.delete(id)
    } catch (error) {
      logger.error("Error deleting profile:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const listProfiles = async (entityId: string | null | undefined, user: AuthContext): Promise<Profile[]> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)

      // Handle null/undefined - list all accessible profiles
      if (entityId === null || entityId === undefined) {
        // List all profiles user can access
        if (isRoot) {
          // Root admin can see all profiles (global + all entity-scoped)
          logger.debug("listProfiles: Root admin - returning all profiles")
          return await profileRepository.findAll()
        } else {
          // Non-root users can only see profiles from their accessible hierarchy
          // Global profiles are NOT accessible to non-root users (security: root-only)
          logger.debug(`listProfiles: Non-root user - returning only accessible entity profiles from hierarchy`)
          return await profileRepository.findByAccessibleEntities(user.entityId)
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
          return await profileRepository.findByEntityId(null)
        } else {
          // Entity-scoped profiles - validate access
          logger.debug(`listProfiles: Returning profiles for entity: ${entityId}`)
          await validateEntityAccess(user.entityId, entityId)
          return await profileRepository.findByEntityId(entityId)
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

