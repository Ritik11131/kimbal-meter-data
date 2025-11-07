import { Entity } from "../models/Entity"
import { getSequelize } from "../database/connection"
import logger from "./logger"

/**
 * Get all descendant entity IDs (children, grandchildren, etc.) from a given entity
 * This includes the entity itself
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
    // Use query without type and raw to get consistent format
    const [queryResult] = await sequelize.query(query, {
      replacements: { entityId },
    }) as [any[], any]
    
    logger.debug(`getAccessibleEntityIds: Query executed, result is array: ${Array.isArray(queryResult)}, length: ${queryResult?.length || 0}`)
    
    if (!Array.isArray(queryResult)) {
      logger.error(`getAccessibleEntityIds: Query result is not an array: ${typeof queryResult}`)
      return []
    }
    
    // Sequelize.query with type: "SELECT" and raw: true
    // Returns: [rows, metadata] where rows is an array of objects
    // Each object: {id: 'uuid'} for our query
    
    // queryResult should now be a direct array of row objects
    const rowsArray = queryResult || []
    
    logger.debug(`getAccessibleEntityIds: Processing ${rowsArray.length} rows`)
    if (rowsArray.length > 0) {
      logger.debug(`getAccessibleEntityIds: First row:`, rowsArray[0])
      logger.debug(`getAccessibleEntityIds: First row type: ${typeof rowsArray[0]}`)
      if (rowsArray[0] && typeof rowsArray[0] === 'object') {
        logger.debug(`getAccessibleEntityIds: First row keys:`, Object.keys(rowsArray[0]))
      }
    }
    
    // Extract IDs from all rows
    const entityIds: string[] = []
    
    for (let i = 0; i < rowsArray.length; i++) {
      const row = rowsArray[i]
      
      try {
        // Handle object format: {id: 'uuid'}
        if (row && typeof row === 'object' && row !== null) {
          // PostgreSQL returns column names in lowercase by default
          const id = row.id || (row as any).ID || (row as any).Id
          
          if (id !== null && id !== undefined) {
            const idStr = String(id).trim()
            if (idStr.length === 36 && idStr.includes('-')) {
              entityIds.push(idStr)
              logger.debug(`getAccessibleEntityIds: [${i}] Extracted UUID: ${idStr}`)
            } else {
              logger.warn(`getAccessibleEntityIds: [${i}] Invalid UUID format: "${idStr}" (length: ${idStr.length})`)
            }
          } else {
            logger.warn(`getAccessibleEntityIds: [${i}] No 'id' found in row. Row keys:`, Object.keys(row))
          }
        } 
        // Handle direct string format
        else if (typeof row === 'string') {
          const idStr = row.trim()
          if (idStr.length === 36 && idStr.includes('-')) {
            entityIds.push(idStr)
            logger.debug(`getAccessibleEntityIds: [${i}] Extracted UUID string: ${idStr}`)
          }
        }
        // Handle any other format
        else {
          logger.warn(`getAccessibleEntityIds: [${i}] Unexpected row type: ${typeof row}, value:`, row)
        }
      } catch (err) {
        logger.error(`getAccessibleEntityIds: [${i}] Error processing row:`, err)
      }
    }
    
    // Ensure we return a proper array
    const result: string[] = [...entityIds]
    
    logger.debug(`getAccessibleEntityIds: Found ${result.length} accessible entities for entity ${entityId}`)
    logger.info(`getAccessibleEntityIds: Found ${result.length} accessible entities for entity ${entityId}:`, result)
    logger.info(`getAccessibleEntityIds: Result type check - isArray: ${Array.isArray(result)}, length: ${result.length}`)
    
    return result
  } catch (error) {
    logger.error("Error getting accessible entity IDs:", error)
    throw error
  }
}

/**
 * Get all ancestor entity IDs (parent, grandparent, etc.) up to root
 * This includes the entity itself
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
    
    // Handle different return formats from Sequelize
    // Sequelize.query with type: "SELECT" returns [rows, metadata] tuple
    let resultArray: any[] = []
    
    if (Array.isArray(queryResult)) {
      // Sequelize.query returns [rows, metadata] for SELECT queries
      // The first element is the rows array
      if (queryResult.length >= 1) {
        resultArray = Array.isArray(queryResult[0]) ? queryResult[0] : queryResult
      }
    } else {
      logger.error("Unexpected query result format:", typeof queryResult)
      return []
    }
    
    // Extract IDs from result objects and ensure we return a proper array
    const entityIds: string[] = []
    for (const r of resultArray) {
      if (typeof r === 'object' && r !== null && 'id' in r) {
        const id = r.id
        if (id !== null && id !== undefined && typeof id === 'string') {
          entityIds.push(id)
        }
      }
    }
    
    // Ensure we return a true array (not array-like object)
    return Array.from(entityIds)
  } catch (error) {
    logger.error("Error getting ancestor entity IDs:", error)
    throw error
  }
}

/**
 * Check if a user's entity can access a target entity
 * Access is granted if:
 * 1. Target entity is the same as user's entity
 * 2. Target entity is a descendant of user's entity (user's entity is ancestor)
 */
export const canAccessEntity = async (userEntityId: string, targetEntityId: string): Promise<boolean> => {
  try {
    if (userEntityId === targetEntityId) {
      logger.debug(`canAccessEntity: Same entity - access granted`)
      return true
    }

    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    
    // Ensure accessibleIds is a true array
    const idsArray = Array.isArray(accessibleIds) ? accessibleIds : []
    
    // Normalize both IDs for comparison (trim whitespace, ensure string)
    const normalizedTargetId = String(targetEntityId).trim()
    
    // Check if target is in accessible IDs
    const found = idsArray.some(id => {
      const normalizedId = String(id).trim()
      return normalizedId === normalizedTargetId
    })
    
    logger.info(`canAccessEntity: User ${userEntityId} checking access to ${targetEntityId}`)
    logger.info(`canAccessEntity: Accessible IDs count: ${idsArray.length}, Found: ${found}`)
    logger.debug(`canAccessEntity: Accessible IDs:`, idsArray)
    logger.debug(`canAccessEntity: Target ID: "${normalizedTargetId}"`)
    
    return found
  } catch (error) {
    logger.error("Error checking entity access:", error)
    return false
  }
}

/**
 * Get the root entity ID for a given entity (traverse up to find root)
 */
export const getRootEntityId = async (entityId: string): Promise<string | null> => {
  try {
    const ancestors = await getAncestorEntityIds(entityId)
    // The last one in the ancestor chain (without a parent) is the root
    // We'll need to check which one has entity_id = null
    if (ancestors.length === 0) return null

    // Find the root by checking which entity has no parent
    const entity = await Entity.findByPk(ancestors[ancestors.length - 1])
    if (!entity) return null

    // Traverse up to find root
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
 * Validate that a target entity is accessible from user's entity hierarchy
 * Throws an error if access is denied
 * 
 * @param userEntityId - The entity ID of the current user
 * @param targetEntityId - The entity ID being accessed
 * @param resourceType - Optional: Type of resource being accessed (e.g., "profiles", "roles", "users", "meters", "entities")
 */
export const validateEntityAccess = async (
  userEntityId: string, 
  targetEntityId: string,
  resourceType?: string
): Promise<void> => {
  logger.info(`validateEntityAccess: Validating access - User: ${userEntityId}, Target: ${targetEntityId}`)
  const hasAccess = await canAccessEntity(userEntityId, targetEntityId)
  if (!hasAccess) {
    logger.error(`validateEntityAccess: ACCESS DENIED - User: ${userEntityId}, Target: ${targetEntityId}`)
    const { AppError } = await import("../middleware/errorHandler")
    const { HTTP_STATUS } = await import("../config/constants")
    
    // Create more specific error message based on resource type
    let errorMessage: string
    if (resourceType) {
      errorMessage = `You cannot access ${resourceType} from entity ${targetEntityId} as it is outside your hierarchy`
    } else {
      errorMessage = `You cannot access entity ${targetEntityId} as it is outside your hierarchy`
    }
    
    throw new AppError(errorMessage, HTTP_STATUS.FORBIDDEN)
  }
  logger.info(`validateEntityAccess: Access granted - User: ${userEntityId}, Target: ${targetEntityId}`)
}


