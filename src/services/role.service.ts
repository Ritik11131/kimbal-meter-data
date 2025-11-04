import { createRoleRepository } from "../repositories/role.repository"
import type { Role } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess } from "../utils/hierarchy"

export const createRoleService = () => {
  const roleRepository = createRoleRepository()

  const getRoleById = async (id: string, user: AuthContext): Promise<Role> => {
    const role = await roleRepository.findById(id)
    if (!role) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    // Validate access if role is entity-scoped (entity_id is not null)
    if (role.entity_id) {
      await validateEntityAccess(user.entityId, role.entity_id)
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
        await validateEntityAccess(user.entityId, entityId)
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

  const listRolesByEntity = async (entityId: string | null, user: AuthContext): Promise<Role[]> => {
    try {
      // Validate access if listing entity-scoped roles
      if (entityId) {
        await validateEntityAccess(user.entityId, entityId)
      }
      return await roleRepository.findByEntityId(entityId)
    } catch (error) {
      logger.error("Error listing roles:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getRoleById,
    createRole,
    updateRole,
    listRolesByEntity,
  }
}
