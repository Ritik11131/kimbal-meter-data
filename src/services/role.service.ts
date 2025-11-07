import { createRoleRepository } from "../repositories/role.repository"
import { createUserRepository } from "../repositories/user.repository"
import type { Role } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { Entity } from "../models/Entity"

const isRootAdmin = async (userEntityId: string): Promise<boolean> => {
  const entity = await Entity.findByPk(userEntityId)
  if (!entity) return false
  return entity.entity_id === null
}

export const createRoleService = () => {
  const roleRepository = createRoleRepository()
  const userRepository = createUserRepository()

  const getRoleById = async (id: string, user: AuthContext): Promise<Role> => {
    const role = await roleRepository.findById(id)
    if (!role) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    // Validate access if role is entity-scoped (entity_id is not null)
    if (role.entity_id) {
      await validateEntityAccess(user.entityId, role.entity_id, "role")
    }
    // Global roles (entity_id = null) are accessible to all authenticated users
    return role
  }

  const createRole = async (
    name: string,
    permissions: Array<{
      moduleId: string
      name: string
      read: boolean
      write: boolean
    }>,
    entityId: string | null,
    user: AuthContext,
  ): Promise<Role> => {
    try {
      // Validate access if creating entity-scoped role
      if (entityId) {
        await validateEntityAccess(user.entityId, entityId, "roles")
      }
      const attributes = { roles: permissions }
      return await roleRepository.createRole(name, entityId, attributes, user.userId)
    } catch (error) {
      logger.error("Error creating role:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const updateRole = async (
    id: string,
    user: AuthContext,
    name?: string,
    permissions?: Array<{
      moduleId: string
      name: string
      read: boolean
      write: boolean
    }>,
  ): Promise<Role> => {
    try {
      await getRoleById(id, user)

      const attributes = permissions ? { roles: permissions } : undefined
      const updateData: Partial<Role> = {}
      if (name !== undefined) updateData.name = name
      if (attributes !== undefined) updateData.attributes = attributes

      const updated = await roleRepository.updateRole(id, updateData)
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      return updated
    } catch (error) {
      logger.error("Error updating role:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const listRolesByEntity = async (
    entityId: string | null,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Role[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      let accessibleEntityIds: string[] | undefined

      // Validate access if listing entity-scoped roles
      if (entityId) {
        await validateEntityAccess(user.entityId, entityId, "roles")
        const { data, total } = await roleRepository.paginateRoles(page, limit, entityId)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      } else {
        // List all accessible roles (global + entity-scoped)
        // For non-root users, get accessible entity IDs
        const isRoot = await isRootAdmin(user.entityId)
        if (!isRoot) {
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
        }
        const { data, total } = await roleRepository.paginateRoles(page, limit, null, accessibleEntityIds)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
    } catch (error) {
      logger.error("Error listing roles:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const deleteRole = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getRoleById(id, user)
      
      // Check if role is assigned to any users
      const usersWithRole = await userRepository.findByRoleId(id)
      if (usersWithRole.length > 0) {
        throw new AppError(
          `Cannot delete role: Role is assigned to ${usersWithRole.length} user(s). Please reassign users to another role first.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
      
      await roleRepository.delete(id)
    } catch (error) {
      logger.error("Error deleting role:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getRoleById,
    createRole,
    updateRole,
    listRolesByEntity,
    deleteRole,
  }
}
