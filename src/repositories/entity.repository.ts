import { createBaseRepository } from "./base.repository"
import { Entity } from "../models/Entity" // Your Sequelize entity model class
import type { CreateEntityDTO, UpdateEntityDTO } from "../types/entities"
import { getSequelize } from "../database/connection"
import logger from "../utils/logger"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

export const createEntityRepository = () => {
  const baseRepo = createBaseRepository(Entity)

  const findByEmail = async (email: string) => {
    const entityInstance = await Entity.findOne({ where: { email_id: email } })
    if (!entityInstance) return null
    return entityInstance.get() as Entity
  }

  const findByProfileId = async (profileId: string) => {
    const entities = await Entity.findAll({
      where: { profile_id: profileId },
      order: [["creation_time", "DESC"]],
    })
    return entities.map(entity => entity.get() as Entity)
  }

  const findHierarchy = async (entityId: string, maxDepth?: number) => {
    try {
      const sequelize = getSequelize()
      
      // If maxDepth is specified, limit recursion depth
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
      // Raw SQL query returns plain objects (not Sequelize instances)
      const [results] = await sequelize.query(query, {
        replacements: { 
          entityId,
          maxDepth: maxDepth ?? 999 // Default to deep recursion if not specified
        },
      }) as [any[], any]
      
      logger.debug(`findHierarchy: Found ${results?.length || 0} entities in hierarchy for ${entityId} (maxDepth: ${maxDepth ?? 'unlimited'})`)
      
      if (!Array.isArray(results)) {
        logger.error(`findHierarchy: Query result is not an array: ${typeof results}`)
        return []
      }
      
      // Raw SQL already returns plain objects, but ensure they're properly formatted
      // Convert to plain objects if they have Sequelize instance properties
      return results.map((row: any) => {
        // If it's already a plain object (from raw SQL), return as-is
        if (row && !row.dataValues && typeof row.get !== 'function') {
          return row as Entity
        }
        // If it somehow is a Sequelize instance, convert it
        if (row && typeof row.get === 'function') {
          return row.get() as Entity
        }
        // If it has dataValues, extract it
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
   * Get direct children of an entity with pagination (optimized for large datasets)
   */
  const findDirectChildren = async (entityId: string, page = 1, limit = 10) => {
    try {
      const offset = (page - 1) * limit
      const { count, rows } = await Entity.findAndCountAll({
        where: { entity_id: entityId },
        offset,
        limit,
        order: [["creation_time", "DESC"]],
      })
      
      logger.debug(`findDirectChildren: Found ${count} total children for ${entityId}, returning ${rows.length} on page ${page}`)
      
      // Convert Sequelize instances to plain objects
      const plainData = rows.map(row => row.get() as Entity)
      
      return { data: plainData, total: count }
    } catch (error) {
      logger.error("Find direct children failed:", error)
      throw error
    }
  }

  const createEntity = async (data: CreateEntityDTO, createdBy: string) => {
    const entityInstance = await Entity.create({
      ...data,
      created_by: createdBy,
      entity_id: data.entity_id || null,
    })
    return entityInstance.get() as Entity
  }

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

  const paginateEntities = async (page = 1, limit = 10, profileId?: string, accessibleEntityIds?: string[], parentEntityId?: string | null) => {
    const where: any = {}
    
    // Handle profileId filter (skip if empty string)
    if (profileId && profileId.trim() !== "") {
      where.profile_id = profileId
      logger.debug(`Filtering by profileId: ${profileId}`)
    }
    
    // Handle parentEntityId filter (list child entities of a specific entity)
    if (parentEntityId !== null && parentEntityId !== undefined) {
      where.entity_id = parentEntityId
      logger.debug(`Filtering by parentEntityId (children of): ${parentEntityId}`)
    }
    
    // Handle hierarchy filtering using IN clause (only if no parentEntityId filter)
    if (parentEntityId === null || parentEntityId === undefined) {
      if (accessibleEntityIds && accessibleEntityIds.length > 0) {
        where.id = {
          [Op.in]: accessibleEntityIds
        }
        logger.debug(`Filtering by accessibleEntityIds (${accessibleEntityIds.length} entities)`)
      } else if (accessibleEntityIds === undefined) {
        // undefined means root admin - show all entities (no filter)
        logger.debug('No accessibleEntityIds filter (root admin - showing all entities)')
      } else {
        // accessibleEntityIds is empty array - no accessible entities
        logger.warn('accessibleEntityIds is empty array - user has no accessible entities')
        // Force empty result by setting impossible condition
        where.id = { [Op.in]: [] }
      }
    }

    logger.debug('Entity query where clause:', JSON.stringify(where))
    logger.info('Entity query where clause:', JSON.stringify(where))

    const { count, rows } = await Entity.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit,
      order: [["creation_time", "DESC"]],
    })

    logger.debug(`Found ${count} total entities, returning ${rows.length} on page ${page}`)
    logger.info(`paginateEntities: Found ${count} total entities, returning ${rows.length} on page ${page}`)
    if (rows.length > 0) {
      logger.info(`paginateEntities: Entity IDs returned:`, rows.map((r: any) => r.id))
    }

    // Convert Sequelize instances to plain objects
    const plainData = rows.map(row => row.get() as Entity)

    return { data: plainData, total: count }
  }

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

  // Override base findById to return plain object
  const findById = async (id: string) => {
    const entityInstance = await Entity.findByPk(id)
    if (!entityInstance) return null
    return entityInstance.get() as Entity
  }

  return {
    ...baseRepo,
    findById, // Override base findById
    findByEmail,
    findByProfileId,
    findHierarchy,
    findDirectChildren,
    createEntity,
    updateEntity,
    paginateEntities,
    findByAccessibleEntities,
  }
}
