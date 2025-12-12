import { createRoleRepository } from "../repositories/role.repository"
import { createUserRepository } from "../repositories/user.repository"
import { createEntityService } from "./entity.service"
import { createEntityRepository } from "../repositories/entity.repository"
import type { Role } from "../types/entities"
import type { RoleHierarchyResponse, RolePathResponse, PathItem } from "../types/search"
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
  const entityRepository = createEntityRepository()

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
   * Gets exact path from logged-in user's entity to role (path-only, no siblings)
   * @param roleId - Role ID
   * @param user - Authenticated user context
   * @returns Role path response with exact entity path and user path
   */
  const getRolePathFromUserEntity = async (
    roleId: string,
    user: AuthContext
  ): Promise<RolePathResponse> => {
    try {
      const role = await getRoleById(roleId, user)

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      // Get entity path if role has an entity
      const entityPathItems: PathItem[] = []
      if (role.entity_id) {
        const entityPath = await entityService.getEntityPathFromUserEntity(role.entity_id, user)
        entityPathItems.push(...entityPath.path)
      }

      // Get user path: from logged-in user to role creator
      let userPathItems: PathItem[] = []
      if (role.created_by) {
        const roleCreatorId = role.created_by
        const creatorUser = await userRepository.findById(roleCreatorId)
        if (!creatorUser) {
          // Creator not found, skip user path
          userPathItems = []
        } else {
          // Get user path from logged-in user to role creator
          const userPathData = await userRepository.findUserPathFromLoggedInUser(user.userId, roleCreatorId)
          
          // Convert to PathItem format
          userPathItems = userPathData.map((u) => ({
            id: u.id,
            name: u.name,
            type: "user" as const,
            isSelected: u.id === roleCreatorId,
            email: u.email,
            entityId: u.entity_id,
          }))
        }
      }

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "role",
          id: role.id,
          name: role.name,
          entityId: role.entity_id,
        },
        role,
        entityPath: entityPathItems,
        userPath: userPathItems,
      }
    } catch (error) {
      logger.error("Error fetching role path:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Gets role hierarchy starting from logged-in user's entity
   * @deprecated Use getRolePathFromUserEntity for path-only results
   * @param roleId - Role ID
   * @param user - Authenticated user context
   * @param options - Optional depth for entity hierarchy
   * @returns Role hierarchy response with entity hierarchy from user's entity
   */
  const getRoleHierarchyFromUserEntity = async (
    roleId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<RoleHierarchyResponse> => {
    try {
      const role = await getRoleById(roleId, user)

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      let entityHierarchy = undefined

      // If role has an entity, get hierarchy from user's entity to role's entity
      if (role.entity_id) {
        await validateEntityAccess(user.entityId, role.entity_id, "entity")
        const hierarchy = await entityService.getEntityHierarchy(user.entityId, user, { depth: options?.depth })
        entityHierarchy = entityService.markSelectedEntity(hierarchy, role.entity_id)
      }

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "role",
          id: role.id,
          name: role.name,
          entityId: role.entity_id,
        },
        role,
        entityHierarchy,
      }
    } catch (error) {
      logger.error("Error fetching role hierarchy:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Gets role hierarchy (legacy method - kept for backward compatibility)
   * @param roleId - Role ID
   * @param user - Authenticated user context
   * @param options - Optional depth for entity hierarchy
   * @returns Role with entity hierarchy
   */
  const getRoleHierarchy = async (
    roleId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<any> => {
    const result = await getRoleHierarchyFromUserEntity(roleId, user, options)
    return {
      ...result.role,
      entity: result.entityHierarchy,
    }
  }

  return {
    getRoleById,
    createRole,
    updateRole,
    listRolesByEntity,
    deleteRole,
    getRoleHierarchy,
    getRoleHierarchyFromUserEntity,
    getRolePathFromUserEntity,
  }
}
