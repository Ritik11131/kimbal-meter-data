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
      await validateEntityAccess(user.entityId, targetEntityId)

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
      await validateEntityAccess(user.entityId, targetEntityId)

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
      await validateEntityAccess(user.entityId, parentEntityId)

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
 * Helper to get hierarchy-scoped where clause for Sequelize queries
 * Returns a where condition that filters entities to only those accessible by user's entity
 */
export const getHierarchyScope = async (userEntityId: string) => {
  const accessibleIds = await getAccessibleEntityIds(userEntityId)
  return {
    id: accessibleIds,
  }
}

