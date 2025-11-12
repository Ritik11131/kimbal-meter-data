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
 * Middleware to enforce entity access for query parameters or body
 * @param paramName - Name of the query/body parameter containing entity ID (default: "entityId")
 */
export const enforceEntityAccessQuery = (paramName: string = "entityId") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }

      const targetEntityId = (req.query[paramName] as string) || req.body[paramName] || req.body[paramName.toLowerCase()]
      
      if (!targetEntityId || targetEntityId === "" || targetEntityId === "null" || targetEntityId === "undefined") {
        return next()
      }

      const user = req.user as AuthContext
      const fullPath = (req.baseUrl || "") + (req.path || "") || req.originalUrl || ""
      const pathParts = fullPath.split("/").filter(Boolean)
      
      const { RESOURCE_TYPE_MAP } = await import("../config/constants")
      let resourceType = "Entities"
      for (const part of pathParts) {
        const normalizedPart = part.toLowerCase()
        if (normalizedPart === "api") continue
        
        if (RESOURCE_TYPE_MAP[normalizedPart]) {
          resourceType = RESOURCE_TYPE_MAP[normalizedPart]
          break
        }
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
 * Validates entity_id in request body before allowing entity creation
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
          if (resource.entity_id === null) {
            const { isRootAdmin } = await import("../utils/rootAdmin")
            const isRoot = await isRootAdmin(user.entityId)
            if (!isRoot) {
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
 * Gets hierarchy-scoped where clause for Sequelize queries
 * @param userEntityId - User's entity ID
 * @returns Where condition object for filtering accessible entities
 */
export const getHierarchyScope = async (userEntityId: string) => {
  const accessibleIds = await getAccessibleEntityIds(userEntityId)
  return {
    id: accessibleIds,
  }
}

