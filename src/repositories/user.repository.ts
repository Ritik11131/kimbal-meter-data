import { createBaseRepository } from "./base.repository"
import { User } from "../models/User" // Your Sequelize User model class
import type { User as UserType, CreateUserDTO, UpdateUserDTO } from "../types/users"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"
import { buildSearchCondition, hasSearchCondition } from "../utils/search"
import { getSequelize } from "../database/connection"
import logger from "../utils/logger"

export const createUserRepository = () => {
  const baseRepo = createBaseRepository(User)

  const findById = async (id: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { id, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByEmail = async (email: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { email, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByMobileNo = async (mobileNo: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { mobile_no: mobileNo, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByEntityId = async (entityId: string): Promise<UserType[]> => {
    const users = await User.findAll({
      where: { entity_id: entityId, is_deleted: false },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  const paginateByEntityId = async (
    entityId: string,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: UserType[]; total: number }> => {
    const where: any = {
      entity_id: entityId,
      is_deleted: false,
    }
    
    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name", "email", "mobile_no"])
    if (hasSearchCondition(searchCondition)) {
      const existingKeys = Object.keys(where).filter(key => key !== 'and' && key !== 'or')
      if (existingKeys.length > 0) {
        // Combine existing conditions with search using AND
        const existingWhere = { ...where }
        where[Op.and] = [existingWhere, searchCondition]
        for (const key of existingKeys) {
          delete where[key]
        }
      } else {
        // No existing conditions, just use search condition directly
        Object.assign(where, searchCondition)
      }
    }
    
    const { data, total } = await baseRepo.paginate(page, limit, where)
    return {
      data: data.map(user => user.get() as UserType),
      total,
    }
  }

  const create = async (
    data: CreateUserDTO,
    passwordHash: string,
    salt: string,
    createdBy?: string
  ): Promise<UserType> => {
    const userInstance = await User.create({
     email: data.email,
      mobile_no: data.mobile_no,
      name: data.name,
      password_hash: passwordHash,
      salt: salt,
      entity_id: data.entity_id,
      role_id: data.role_id,
      created_by: createdBy || null,
    })
    return userInstance.get() as UserType
  }

  const update = async (id: string, data: UpdateUserDTO): Promise<UserType | null> => {
    const userInstance = await User.findByPk(id)
    if (!userInstance) return null

    const updateData: any = {}
    if (data.email !== undefined) updateData.email = data.email
    if (data.mobile_no !== undefined) updateData.mobile_no = data.mobile_no
    if (data.name !== undefined) updateData.name = data.name
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    
    // Handle attributes: merge with existing attributes if provided
    if (data.attributes !== undefined) {
      if (data.attributes === null) {
        // Explicitly set to null if null is provided
        updateData.attributes = null
      } else {
        // Merge with existing attributes
        const existingAttributes = (userInstance.get() as UserType).attributes || {}
        updateData.attributes = { ...existingAttributes, ...data.attributes }
      }
    }

    await userInstance.update(updateData)
    return userInstance.get() as UserType
  }

  const softDelete = async (id: string): Promise<number> => {
    const user = await User.findByPk(id)
    if (!user) return 0
    await user.update({ is_deleted: true })
    return 1
  }

  const findByRoleId = async (roleId: string): Promise<UserType[]> => {
    const users = await User.findAll({
      where: { role_id: roleId, is_deleted: false },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  const changePassword = async (id: string, passwordHash: string, salt: string): Promise<UserType | null> => {
    const userInstance = await User.findByPk(id)
    if (!userInstance) return null
    await userInstance.update({ password_hash: passwordHash, salt })
    return userInstance.get() as UserType
  }

  const findByAccessibleEntities = async (userEntityId: string): Promise<UserType[]> => {
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    const users = await User.findAll({
      where: { 
        entity_id: {
          [Op.in]: accessibleIds
        },
        is_deleted: false 
      },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  const paginateByAccessibleEntities = async (
    accessibleEntityIds: string[] | undefined,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: UserType[]; total: number }> => {
    const where: any = {
      is_deleted: false,
    }
    
    // If undefined, it means root admin - no entity filter
    if (accessibleEntityIds !== undefined) {
      if (accessibleEntityIds.length > 0) {
        where.entity_id = {
          [Op.in]: accessibleEntityIds
        }
      } else {
        // Empty array means no accessible entities - return empty result
        where.id = { [Op.in]: [] }
      }
    }
    // If undefined, don't add entity filter (root admin can see all)
    
    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name", "email", "mobile_no"])
    if (hasSearchCondition(searchCondition)) {
      const existingKeys = Object.keys(where).filter(key => key !== 'and' && key !== 'or')
      if (existingKeys.length > 0) {
        // Combine existing conditions with search using AND
        const existingWhere = { ...where }
        where[Op.and] = [existingWhere, searchCondition]
        for (const key of existingKeys) {
          delete where[key]
        }
      } else {
        // No existing conditions, just use search condition directly
        Object.assign(where, searchCondition)
      }
    }
    
    const { data, total } = await baseRepo.paginate(page, limit, where)
    return {
      data: data.map(user => user.get() as UserType),
      total,
    }
  }

  /**
   * Finds the exact path from root user to target user (via created_by, no siblings)
   * @param rootUserId - Root user ID (starting point)
   * @param targetUserId - Target user ID (end point)
   * @returns Array of users in path order (from root to target)
   */
  const findUserPath = async (rootUserId: string, targetUserId: string): Promise<UserType[]> => {
    try {
      const sequelize = getSequelize()
      
      // Get all ancestors of target user (via created_by, including target itself)
      const [targetAncestors] = await sequelize.query(`
        WITH RECURSIVE user_path AS (
          SELECT *, 0 as depth FROM users WHERE id = :targetUserId AND is_deleted = false
          UNION ALL
          SELECT u.*, up.depth + 1 as depth FROM users u
          INNER JOIN user_path up ON u.id = up.created_by
          WHERE u.is_deleted = false AND u.id IS NOT NULL
        )
        SELECT * FROM user_path ORDER BY depth DESC;
      `, {
        replacements: { targetUserId },
      }) as [any[], any]
      
      // Convert to UserType array
      const allUsers = targetAncestors.map((row: any) => {
        if (row && typeof row.get === 'function') {
          return row.get() as UserType
        }
        if (row && row.dataValues) {
          return row.dataValues as UserType
        }
        return row as UserType
      })
      
      // Build path by following created_by relationships from target back to root
      const userMap = new Map<string, UserType>()
      allUsers.forEach(user => userMap.set(user.id, user))
      
      const path: UserType[] = []
      let currentId: string | null = targetUserId
      const visited = new Set<string>()
      
      // Traverse from target up to root
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId)
        const user = userMap.get(currentId)
        if (!user) break
        
        path.unshift(user) // Add to beginning to maintain root -> target order
        
        if (currentId === rootUserId) {
          break
        }
        
        currentId = user.created_by
      }
      
      return path
    } catch (error) {
      logger.error("Find user path failed:", error)
      throw error
    }
  }

  /**
   * Finds user hierarchy using recursive CTE query (via created_by relationship)
   * @param userId - Root user ID
   * @param maxDepth - Optional maximum depth
   * @returns Array of users in hierarchy
   */
  const findUserHierarchy = async (userId: string, maxDepth?: number): Promise<UserType[]> => {
    try {
      const sequelize = getSequelize()
      
      let depthCondition = ''
      if (maxDepth !== undefined && maxDepth > 0) {
        depthCondition = 'AND depth < :maxDepth'
      }
      
      const query = `
        WITH RECURSIVE user_tree AS (
          SELECT *, 0 as depth FROM users WHERE id = :userId AND is_deleted = false
          UNION ALL
          SELECT u.*, ut.depth + 1 as depth FROM users u
          INNER JOIN user_tree ut ON u.created_by = ut.id
          WHERE u.is_deleted = false AND ut.depth + 1 <= COALESCE(:maxDepth, 999) ${depthCondition}
        )
        SELECT * FROM user_tree ORDER BY depth, creation_time;
      `
      const [results] = await sequelize.query(query, {
        replacements: { 
          userId,
          maxDepth: maxDepth ?? 999
        },
      }) as [any[], any]
      
      if (!Array.isArray(results)) {
        logger.error(`findUserHierarchy: Query result is not an array: ${typeof results}`)
        return []
      }
      
      return results.map((row: any) => {
        if (row && !row.dataValues && typeof row.get !== 'function') {
          return row as UserType
        }
        if (row && typeof row.get === 'function') {
          return row.get() as UserType
        }
        if (row && row.dataValues) {
          return row.dataValues as UserType
        }
        return row as UserType
      })
    } catch (error) {
      logger.error("Find user hierarchy failed:", error)
      throw error
    }
  }

  return {
    ...baseRepo,
    findById,
    findByEmail,
    findByMobileNo,
    findByEntityId,
    paginateByEntityId,
    create,
    update,
    softDelete,
    findByRoleId,
    changePassword,
    findByAccessibleEntities,
    paginateByAccessibleEntities,
    findUserHierarchy,
    findUserPath,
  }
}
