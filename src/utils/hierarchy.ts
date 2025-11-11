import { Entity } from "../models/Entity"
import { getSequelize } from "../database/connection"
import logger from "./logger"

/**
 * Gets all descendant entity IDs (children, grandchildren, etc.) from a given entity
 * Includes the entity itself
 * @param entityId - The entity ID to get descendants for
 * @returns Array of entity IDs including the entity itself and all descendants
 */
export const getAccessibleEntityIds = async (entityId: string): Promise<string[]> => {
  try {
    const sequelize = getSequelize()
    const query = `
      WITH RECURSIVE entity_tree AS (
        SELECT id FROM entities WHERE id = :entityId
        UNION ALL
        SELECT e.id FROM entities e
        INNER JOIN entity_tree et ON e.entity_id = et.id
        WHERE e.id IS NOT NULL
      )
      SELECT id FROM entity_tree;
    `
    const [queryResult] = await sequelize.query(query, {
      replacements: { entityId },
    }) as [any[], any]
    
    if (!Array.isArray(queryResult)) {
      logger.error(`getAccessibleEntityIds: Query result is not an array: ${typeof queryResult}`)
      return []
    }
    
    const rowsArray = queryResult || []
    const entityIds: string[] = []
    
    for (let i = 0; i < rowsArray.length; i++) {
      const row = rowsArray[i]
      
      try {
        if (row && typeof row === 'object' && row !== null) {
          const id = row.id || (row as any).ID || (row as any).Id
          
          if (id !== null && id !== undefined) {
            const idStr = String(id).trim()
            if (idStr.length === 36 && idStr.includes('-')) {
              entityIds.push(idStr)
            }
          }
        } else if (typeof row === 'string') {
          const idStr = row.trim()
          if (idStr.length === 36 && idStr.includes('-')) {
            entityIds.push(idStr)
          }
        }
      } catch (err) {
        logger.error(`getAccessibleEntityIds: Error processing row ${i}:`, err)
      }
    }
    
    return [...entityIds]
  } catch (error) {
    logger.error("Error getting accessible entity IDs:", error)
    throw error
  }
}

/**
 * Gets all ancestor entity IDs (parent, grandparent, etc.) up to root
 * Includes the entity itself
 * @param entityId - The entity ID to get ancestors for
 * @returns Array of entity IDs including the entity itself and all ancestors
 */
export const getAncestorEntityIds = async (entityId: string): Promise<string[]> => {
  try {
    const sequelize = getSequelize()
    const query = `
      WITH RECURSIVE entity_tree AS (
        SELECT id, entity_id FROM entities WHERE id = :entityId
        UNION ALL
        SELECT e.id, e.entity_id FROM entities e
        INNER JOIN entity_tree et ON e.id = et.entity_id
        WHERE e.id IS NOT NULL
      )
      SELECT id FROM entity_tree;
    `
    const queryResult = await sequelize.query(query, {
      replacements: { entityId },
      type: "SELECT",
      raw: true,
    })
    
    let resultArray: any[] = []
    
    if (Array.isArray(queryResult)) {
      if (queryResult.length >= 1) {
        resultArray = Array.isArray(queryResult[0]) ? queryResult[0] : queryResult
      }
    } else {
      logger.error("Unexpected query result format:", typeof queryResult)
      return []
    }
    
    const entityIds: string[] = []
    for (const r of resultArray) {
      if (typeof r === 'object' && r !== null && 'id' in r) {
        const id = r.id
        if (id !== null && id !== undefined && typeof id === 'string') {
          entityIds.push(id)
        }
      }
    }
    
    return Array.from(entityIds)
  } catch (error) {
    logger.error("Error getting ancestor entity IDs:", error)
    throw error
  }
}

/**
 * Checks if a user's entity can access a target entity
 * Access is granted if target entity is the same as user's entity or is a descendant
 * @param userEntityId - The entity ID of the user
 * @param targetEntityId - The entity ID being accessed
 * @returns True if access is granted, false otherwise
 */
export const canAccessEntity = async (userEntityId: string, targetEntityId: string): Promise<boolean> => {
  try {
    if (userEntityId === targetEntityId) {
      return true
    }

    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    const idsArray = Array.isArray(accessibleIds) ? accessibleIds : []
    const normalizedTargetId = String(targetEntityId).trim()
    
    const found = idsArray.some(id => {
      const normalizedId = String(id).trim()
      return normalizedId === normalizedTargetId
    })
    
    return found
  } catch (error) {
    logger.error("Error checking entity access:", error)
    return false
  }
}

/**
 * Gets the root entity ID for a given entity by traversing up the hierarchy
 * @param entityId - The entity ID to find the root for
 * @returns The root entity ID or null if not found
 */
export const getRootEntityId = async (entityId: string): Promise<string | null> => {
  try {
    const ancestors = await getAncestorEntityIds(entityId)
    if (ancestors.length === 0) return null

    const entity = await Entity.findByPk(ancestors[ancestors.length - 1])
    if (!entity) return null

    let current: Entity | null = entity
    while (current && current.entity_id) {
      current = await Entity.findByPk(current.entity_id)
    }

    return current?.id || null
  } catch (error) {
    logger.error("Error getting root entity ID:", error)
    return null
  }
}

/**
 * Validates that a target entity is accessible from user's entity hierarchy
 * Throws an error if access is denied
 * @param userEntityId - The entity ID of the current user
 * @param targetEntityId - The entity ID being accessed
 * @param resourceType - Optional: Type of resource being accessed (e.g., "profiles", "roles", "users", "meters", "entities")
 * @throws AppError with FORBIDDEN status if access is denied
 */
export const validateEntityAccess = async (
  userEntityId: string, 
  targetEntityId: string,
  resourceType?: string
): Promise<void> => {
  const hasAccess = await canAccessEntity(userEntityId, targetEntityId)
  if (!hasAccess) {
    logger.error(`validateEntityAccess: ACCESS DENIED - User: ${userEntityId}, Target: ${targetEntityId}`)
    const { AppError } = await import("../middleware/errorHandler")
    const { HTTP_STATUS } = await import("../config/constants")
    
    let errorMessage: string
    if (resourceType) {
      errorMessage = `You cannot access ${resourceType} from entity ${targetEntityId} as it is outside your hierarchy`
    } else {
      errorMessage = `You cannot access entity ${targetEntityId} as it is outside your hierarchy`
    }
    
    throw new AppError(errorMessage, HTTP_STATUS.FORBIDDEN)
  }
}


