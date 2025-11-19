import { createRoleRepository } from "../repositories/role.repository"
import { createUserRepository } from "../repositories/user.repository"
import { createEntityService } from "./entity.service"
import type { Role } from "../types/entities"
import type { RoleHierarchy } from "../types/search"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { isRootAdmin } from "../utils/rootAdmin"

export const createRoleService = () => {
  const roleRepository = createRoleRepository()
  const userRepository = createUserRepository()
  const entityService = createEntityService()

  /**
   * Retrieves a role by ID and validates access
   * @param id - Role ID
   * @param user - Authenticated user context
   * @returns Role object
   */
  const getRoleById = async (id: string, user: AuthContext): Promise<Role> => {
    const role = await roleRepository.findById(id)
    if (!role) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    if (role.entity_id) {
      await validateEntityAccess(user.entityId, role.entity_id, "role")
    }
    return role
  }

  /**
   * Creates a new role
   * @param name - Role name
   * @param permissions - Array of permission objects
   * @param entityId - Optional entity ID for entity-scoped role
   * @param user - Authenticated user context
   * @returns Created role
   */
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

  /**
   * Updates an existing role
   * @param id - Role ID
   * @param user - Authenticated user context
   * @param name - Optional role name
   * @param permissions - Optional permissions array
   * @returns Updated role
   */
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

  /**
   * Lists roles with pagination and optional entity filter
   * @param entityId - Optional entity ID filter
   * @param user - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated role list
   */
  const listRolesByEntity = async (
    entityId: string | null,
    user: AuthContext,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: Role[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      let accessibleEntityIds: string[] | undefined

      if (entityId) {
        const { data, total } = await roleRepository.paginateRoles(page, limit, entityId, undefined, search)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      } else {
        const isRoot = await isRootAdmin(user.entityId)
        if (!isRoot) {
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
        }
        const { data, total } = await roleRepository.paginateRoles(page, limit, null, accessibleEntityIds, search)
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

  /**
   * Deletes a role
   * @param id - Role ID
   * @param user - Authenticated user context
   */
  const deleteRole = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getRoleById(id, user)
      
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

  /**
   * Gets role hierarchy (role with its entity hierarchy)
   * @param roleId - Role ID
   * @param user - Authenticated user context
   * @param options - Optional depth for entity hierarchy
   * @returns Role with entity hierarchy
   */
  const getRoleHierarchy = async (
    roleId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<RoleHierarchy> => {
    try {
      const role = await getRoleById(roleId, user)

      const result: RoleHierarchy = {
        ...role,
        entity: undefined,
      }

      // If role has an entity, get its hierarchy
      if (role.entity_id) {
        await validateEntityAccess(user.entityId, role.entity_id, "entity")
        const entityHierarchy = await entityService.getEntityHierarchy(
          role.entity_id,
          user,
          { depth: options?.depth }
        )
        result.entity = {
          id: entityHierarchy.id,
          name: entityHierarchy.name,
          children: (entityHierarchy as any).children || [],
        }
      }

      return result
    } catch (error) {
      logger.error("Error fetching role hierarchy:", error)
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
    getRoleHierarchy,
  }
}
