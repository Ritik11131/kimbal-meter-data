import { createBaseRepository } from "./base.repository"
import { Entity } from "../models/Entity"
import type { CreateEntityDTO, UpdateEntityDTO } from "../types/entities"
import { getSequelize } from "../database/connection"
import logger from "../utils/logger"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"
import { buildSearchCondition, hasSearchCondition } from "../utils/search"

export const createEntityRepository = () => {
  const baseRepo = createBaseRepository(Entity)

  /**
   * Finds an entity by email
   * @param email - Email address
   * @returns Entity or null if not found
   */
  const findByEmail = async (email: string) => {
    const entityInstance = await Entity.findOne({ where: { email_id: email } })
    if (!entityInstance) return null
    return entityInstance.get() as Entity
  }

  /**
   * Finds all entities with a specific profile ID
   * @param profileId - Profile ID
   * @returns Array of entities
   */
  const findByProfileId = async (profileId: string) => {
    const entities = await Entity.findAll({
      where: { profile_id: profileId },
      order: [["creation_time", "DESC"]],
    })
    return entities.map(entity => entity.get() as Entity)
  }

  /**
   * Finds entity hierarchy using recursive CTE query
   * @param entityId - Root entity ID
   * @param maxDepth - Optional maximum depth
   * @returns Array of entities in hierarchy
   */
  const findHierarchy = async (entityId: string, maxDepth?: number) => {
    try {
      const sequelize = getSequelize()
      
      let depthCondition = ''
      if (maxDepth !== undefined && maxDepth > 0) {
        depthCondition = 'AND depth < :maxDepth'
      }
      
      const query = `
        WITH RECURSIVE entity_tree AS (
          SELECT *, 0 as depth FROM entities WHERE id = :entityId
          UNION ALL
          SELECT e.*, et.depth + 1 as depth FROM entities e
          INNER JOIN entity_tree et ON e.entity_id = et.id
          WHERE et.depth + 1 <= COALESCE(:maxDepth, 999) ${depthCondition}
        )
        SELECT * FROM entity_tree ORDER BY depth, creation_time;
      `
      const [results] = await sequelize.query(query, {
        replacements: { 
          entityId,
          maxDepth: maxDepth ?? 999
        },
      }) as [any[], any]
      
      if (!Array.isArray(results)) {
        logger.error(`findHierarchy: Query result is not an array: ${typeof results}`)
        return []
      }
      
      return results.map((row: any) => {
        if (row && !row.dataValues && typeof row.get !== 'function') {
          return row as Entity
        }
        if (row && typeof row.get === 'function') {
          return row.get() as Entity
        }
        if (row && row.dataValues) {
          return row.dataValues as Entity
        }
        return row as Entity
      })
    } catch (error) {
      logger.error("Find hierarchy failed:", error)
      throw error
    }
  }

  /**
   * Gets direct children of an entity with pagination
   * @param entityId - Entity ID
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated children data
   */
  const findDirectChildren = async (entityId: string, page = 1, limit = 10, search?: string) => {
    try {
      const offset = (page - 1) * limit
      const where: any = { entity_id: entityId }
      
      // Add search condition
      const searchCondition = buildSearchCondition(search, ["name", "email_id", "mobile_no"])
      if (hasSearchCondition(searchCondition)) {
        // For findDirectChildren, we always have entity_id condition, so combine with AND
        const existingWhere = { ...where }
        where[Op.and] = [existingWhere, searchCondition]
        // Remove entity_id since it's now in Op.and
        delete where.entity_id
      }
      
      const { count, rows } = await Entity.findAndCountAll({
        where,
        offset,
        limit,
        order: [["creation_time", "DESC"]],
      })
      
      const plainData = rows.map(row => row.get() as Entity)
      
      return { data: plainData, total: count }
    } catch (error) {
      logger.error("Find direct children failed:", error)
      throw error
    }
  }

  /**
   * Creates a new entity
   * @param data - Entity creation data
   * @param createdBy - User ID of creator
   * @returns Created entity
   */
  const createEntity = async (data: CreateEntityDTO, createdBy: string) => {
    const entityInstance = await Entity.create({
      ...data,
      created_by: createdBy,
      entity_id: data.entity_id || null,
    })
    return entityInstance.get() as Entity
  }

  /**
   * Updates an existing entity
   * @param id - Entity ID
   * @param data - Entity update data
   * @returns Updated entity or null if not found
   */
  const updateEntity = async (id: string, data: UpdateEntityDTO) => {
    const entityInstance = await Entity.findByPk(id)
    if (!entityInstance) return null

    const updateData: Partial<UpdateEntityDTO> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.email_id !== undefined) updateData.email_id = data.email_id
    if (data.mobile_no !== undefined) updateData.mobile_no = data.mobile_no
    if (data.attributes !== undefined) updateData.attributes = data.attributes

    await entityInstance.update(updateData)
    return entityInstance.get() as Entity
  }

  /**
   * Paginates entities with optional filters
   * @param page - Page number
   * @param limit - Items per page
   * @param profileId - Optional profile filter
   * @param accessibleEntityIds - Optional hierarchy filter
   * @param parentEntityId - Optional parent entity filter
   * @param search - Optional search term
   * @returns Paginated entity data with plain objects
   */
  const paginateEntities = async (page = 1, limit = 10, profileId?: string, accessibleEntityIds?: string[], parentEntityId?: string | null, search?: string) => {
    const where: any = {}
    
    if (profileId && profileId.trim() !== "") {
      where.profile_id = profileId
    }
    
    if (parentEntityId !== null && parentEntityId !== undefined) {
      where.entity_id = parentEntityId
    }
    
    if (parentEntityId === null || parentEntityId === undefined) {
      if (accessibleEntityIds && accessibleEntityIds.length > 0) {
        where.id = {
          [Op.in]: accessibleEntityIds
        }
      } else if (accessibleEntityIds === undefined) {
        // Root admin - no filter
      } else {
        where.id = { [Op.in]: [] }
      }
    }

    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name", "email_id", "mobile_no"])
    if (hasSearchCondition(searchCondition)) {
      const existingKeys = Object.keys(where).filter(key => key !== 'and' && key !== 'or')
      if (existingKeys.length > 0) {
        // Combine existing conditions with search using AND
        const existingWhere = { ...where }
        where[Op.and] = [existingWhere, searchCondition]
        // Remove individual conditions that are now in Op.and
        for (const key of existingKeys) {
          delete where[key]
        }
      } else {
        // No existing conditions, just use search condition directly
        Object.assign(where, searchCondition)
      }
    }

    const { data, total } = await baseRepo.paginate(page, limit, where)
    
    const plainData = data.map((row: any) => {
      if (row && typeof row.get === 'function') {
        return row.get() as Entity
      }
      return row as Entity
    })

    return { data: plainData, total }
  }

  /**
   * Finds all entities accessible by a user's entity
   * @param userEntityId - User's entity ID
   * @returns Array of accessible entities
   */
  const findByAccessibleEntities = async (userEntityId: string) => {
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    const entities = await Entity.findAll({
      where: { 
        id: {
          [Op.in]: accessibleIds
        }
      },
      order: [["creation_time", "DESC"]],
    })
    return entities.map(entity => entity.get() as Entity)
  }

  /**
   * Finds an entity by ID (returns plain object)
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  const findById = async (id: string) => {
    const entityInstance = await Entity.findByPk(id)
    if (!entityInstance) return null
    return entityInstance.get() as Entity
  }

  /**
   * Finds the exact path from user's entity to target entity (ancestors only, no siblings)
   * @param userEntityId - User's entity ID (starting point)
   * @param targetEntityId - Target entity ID (end point)
   * @returns Array of entities in path order
   */
  const findEntityPath = async (userEntityId: string, targetEntityId: string): Promise<Entity[]> => {
    try {
      const sequelize = getSequelize()
      
      // Get all ancestors of target (including target itself)
      const [targetAncestors] = await sequelize.query(`
        WITH RECURSIVE target_ancestors AS (
          SELECT id, entity_id, name, email_id, mobile_no, profile_id, attributes, created_by, creation_time, last_update_on, 0 as depth 
          FROM entities WHERE id = :targetEntityId
          UNION ALL
          SELECT e.id, e.entity_id, e.name, e.email_id, e.mobile_no, e.profile_id, e.attributes, e.created_by, e.creation_time, e.last_update_on, ta.depth + 1 
          FROM entities e
          INNER JOIN target_ancestors ta ON e.id = ta.entity_id
          WHERE e.id IS NOT NULL
        )
        SELECT * FROM target_ancestors ORDER BY depth DESC;
      `, {
        replacements: { targetEntityId },
      }) as [any[], any]
      
      // Get all descendants of user's entity (including user's entity itself)
      const [userDescendants] = await sequelize.query(`
        WITH RECURSIVE user_descendants AS (
          SELECT id FROM entities WHERE id = :userEntityId
          UNION ALL
          SELECT e.id FROM entities e
          INNER JOIN user_descendants ud ON e.entity_id = ud.id
          WHERE e.id IS NOT NULL
        )
        SELECT id FROM user_descendants;
      `, {
        replacements: { userEntityId },
      }) as [any[], any]
      
      // Find entities that are both in target's ancestors AND user's descendants
      const userDescendantsSet = new Set(
        userDescendants.map((row: any) => row.id || row.ID || row.Id).filter(Boolean)
      )
      
      // Filter target ancestors to only include those in user's descendants
      const pathEntities = targetAncestors
        .filter((row: any) => {
          const id = row.id || row.ID || row.Id
          return id && userDescendantsSet.has(id)
        })
        .map((row: any) => {
          // Convert to Entity format
          if (row && typeof row.get === 'function') {
            return row.get() as Entity
          }
          if (row && row.dataValues) {
            return row.dataValues as Entity
          }
          return row as Entity
        })
      
      // Build path by following parent-child relationships
      const entityMap = new Map<string, Entity>()
      pathEntities.forEach(entity => entityMap.set(entity.id, entity))
      
      // Build path by following parent-child relationships
      const buildPath = (currentId: string, targetId: string, visited: Set<string>): Entity[] => {
        if (currentId === targetId) {
          const entity = entityMap.get(currentId)
          return entity ? [entity] : []
        }
        
        if (visited.has(currentId)) return []
        visited.add(currentId)
        
        const currentEntity = entityMap.get(currentId)
        if (!currentEntity) return []
        
        // Find direct child that leads to target
        for (const [entityId, entity] of entityMap.entries()) {
          if (entity.entity_id === currentId && !visited.has(entityId)) {
            const childPath = buildPath(entityId, targetId, visited)
            if (childPath.length > 0) {
              return [currentEntity, ...childPath]
            }
          }
        }
        
        return []
      }
      
      const path = buildPath(userEntityId, targetEntityId, new Set())
      
      // Fallback: if path building fails, return entities in ancestor order (target to user)
      if (path.length === 0) {
        // Reverse to get from user to target
        return pathEntities.reverse()
      }
      
      return path
    } catch (error) {
      logger.error("Find entity path failed:", error)
      throw error
    }
  }

  return {
    ...baseRepo,
    findById, // Override base findById
    findByEmail,
    findByProfileId,
    findHierarchy,
    findDirectChildren,
    findEntityPath,
    createEntity,
    updateEntity,
    paginateEntities,
    findByAccessibleEntities,
  }
}
