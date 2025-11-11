import { createBaseRepository } from "./base.repository"
import { Entity } from "../models/Entity"
import type { CreateEntityDTO, UpdateEntityDTO } from "../types/entities"
import { getSequelize } from "../database/connection"
import logger from "../utils/logger"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

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
   * @returns Paginated children data
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
   * @returns Paginated entity data with plain objects
   */
  const paginateEntities = async (page = 1, limit = 10, profileId?: string, accessibleEntityIds?: string[], parentEntityId?: string | null) => {
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
