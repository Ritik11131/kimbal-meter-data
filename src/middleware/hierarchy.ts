import type { Request, Response, NextFunction } from "express"
import { AppError } from "./errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import type { AuthContext } from "../types/common"

/**
 * Middleware to enforce entity access based on hierarchy
 * Validates that the entity ID in the request params belongs to user's accessible hierarchy
 * 
 * @param entityIdParam - Name of the param containing entity ID (default: "id")
 */
export const enforceEntityAccess = (entityIdParam: string = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }

      const targetEntityId = req.params[entityIdParam] || req.body.entityId || req.body.entity_id
      if (!targetEntityId) {
        return next() // No entity ID to validate, continue
      }

      const user = req.user as AuthContext
      await validateEntityAccess(user.entityId, targetEntityId, "entities")

      next()
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        error instanceof Error ? error.message : "Access denied to entity outside your hierarchy",
        HTTP_STATUS.FORBIDDEN
      )
    }
  }
}

/**
 * Middleware to enforce entity access for query parameters or body (e.g., ?entityId=xxx or body.entityId)
 */
export const enforceEntityAccessQuery = (paramName: string = "entityId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }

      const targetEntityId = (req.query[paramName] as string) || req.body[paramName] || req.body[paramName.toLowerCase()]
      if (!targetEntityId) {
        return next() // No entity ID found, continue
      }

      const user = req.user as AuthContext
      // Determine resource type from param name for better error messages
      let resourceType = "entities"
      if (paramName.includes("entityId") || paramName.includes("entity_id")) {
        resourceType = "entities"
      }
      await validateEntityAccess(user.entityId, targetEntityId, resourceType)

      next()
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        error instanceof Error ? error.message : "Access denied to entity outside your hierarchy",
        HTTP_STATUS.FORBIDDEN
      )
    }
  }
}

/**
 * Middleware to validate that a parent entity is accessible when creating child entities
 */
export const validateParentEntityAccess = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }

      const parentEntityId = req.body.entity_id || req.body.entityId
      if (!parentEntityId) {
        return next() // Creating root entity, no parent to validate
      }

      const user = req.user as AuthContext
      await validateEntityAccess(user.entityId, parentEntityId, "entities")

      next()
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        error instanceof Error ? error.message : "Cannot create entity under inaccessible parent",
        HTTP_STATUS.FORBIDDEN
      )
    }
  }
}

/**
 * Middleware to enforce entity access for resources where the ID is not the entity ID
 * Fetches the resource, extracts its entity_id, and validates access
 * 
 * @param resourceType - Type of resource ("user", "role", "profile", "meter")
 * @param idParam - Name of the param containing resource ID (default: "id")
 */
export const enforceResourceEntityAccess = (resourceType: "user" | "role" | "profile" | "meter", idParam: string = "id") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }

      const resourceId = req.params[idParam]
      if (!resourceId) {
        return next() // No ID to validate, continue
      }

      const user = req.user as AuthContext
      let targetEntityId: string | null | undefined

      // Fetch resource and extract entity_id based on resource type
      switch (resourceType) {
        case "user": {
          const { createUserRepository } = await import("../repositories/user.repository")
          const userRepo = createUserRepository()
          const resource = await userRepo.findById(resourceId)
          if (!resource) {
            throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
          }
          targetEntityId = resource.entity_id
          break
        }
        case "role": {
          const { createRoleRepository } = await import("../repositories/role.repository")
          const roleRepo = createRoleRepository()
          const resource = await roleRepo.findById(resourceId)
          if (!resource) {
            throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
          }
          // Global roles (entity_id = null) are accessible to all
          if (resource.entity_id === null) {
            return next()
          }
          targetEntityId = resource.entity_id
          break
        }
        case "profile": {
          const { createProfileRepository } = await import("../repositories/profile.repository")
          const profileRepo = createProfileRepository()
          const resource = await profileRepo.findById(resourceId)
          if (!resource) {
            throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
          }
          // Global profiles (entity_id = null) - only root admin can access
          if (resource.entity_id === null) {
            const { Entity } = await import("../models/Entity")
            const entity = await Entity.findByPk(user.entityId)
            if (!entity || entity.entity_id !== null) {
              throw new AppError("Only root admin can access global profiles", HTTP_STATUS.FORBIDDEN)
            }
            return next()
          }
          targetEntityId = resource.entity_id
          break
        }
        case "meter": {
          const { createMeterRepository } = await import("../repositories/meter.repository")
          const meterRepo = createMeterRepository()
          const resource = await meterRepo.findById(resourceId)
          if (!resource) {
            throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
          }
          targetEntityId = resource.entity_id
          break
        }
      }

      // Validate entity access
      if (targetEntityId) {
        await validateEntityAccess(user.entityId, targetEntityId, resourceType)
      }

      next()
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError(
        error instanceof Error ? error.message : "Access denied to resource outside your hierarchy",
        HTTP_STATUS.FORBIDDEN
      )
    }
  }
}

/**
 * Helper to get hierarchy-scoped where clause for Sequelize queries
 * Returns a where condition that filters entities to only those accessible by user's entity
 */
export const getHierarchyScope = async (userEntityId: string) => {
  const accessibleIds = await getAccessibleEntityIds(userEntityId)
  return {
    id: accessibleIds,
  }
}

