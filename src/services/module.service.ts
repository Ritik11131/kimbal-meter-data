import { createModuleRepository } from "../repositories/module.repository"
import { createRoleRepository } from "../repositories/role.repository"
import type { Module, CreateModuleDTO, UpdateModuleDTO } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { isRootAdmin } from "../utils/rootAdmin"

export const createModuleService = () => {
  const moduleRepository = createModuleRepository()
  const roleRepository = createRoleRepository()

  /**
   * Retrieves a module by ID (root admin only)
   * @param id - Module ID
   * @param user - Authenticated user context
   * @returns Module object
   */
  const getModuleById = async (id: string, user: AuthContext): Promise<Module> => {
    const isRoot = await isRootAdmin(user.entityId)
    if (!isRoot) {
      throw new AppError("Only root admin can access modules", HTTP_STATUS.FORBIDDEN)
    }

    const module = await moduleRepository.findById(id)
    if (!module) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return module
  }

  /**
   * Creates a new module (root admin only)
   * @param data - Module creation data
   * @param user - Authenticated user context
   * @returns Created module
   */
  const createModule = async (data: CreateModuleDTO, user: AuthContext): Promise<Module> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can create modules", HTTP_STATUS.FORBIDDEN)
      }

      const existing = await moduleRepository.findByName(data.name)
      if (existing) {
        throw new AppError("Module with this name already exists", HTTP_STATUS.CONFLICT)
      }

      return await moduleRepository.createModule(data, user.userId)
    } catch (error) {
      logger.error("Error creating module:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Updates an existing module (root admin only)
   * @param id - Module ID
   * @param data - Module update data
   * @param user - Authenticated user context
   * @returns Updated module
   */
  const updateModule = async (
    id: string,
    data: UpdateModuleDTO,
    user: AuthContext
  ): Promise<Module> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can update modules", HTTP_STATUS.FORBIDDEN)
      }

      await getModuleById(id, user)

      if (data.name) {
        const existing = await moduleRepository.findByName(data.name)
        if (existing && existing.id !== id) {
          throw new AppError("Module with this name already exists", HTTP_STATUS.CONFLICT)
        }
      }

      const updated = await moduleRepository.updateModule(id, data)
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      return updated
    } catch (error) {
      logger.error("Error updating module:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Deletes a module (root admin only)
   * @param id - Module ID
   * @param user - Authenticated user context
   */
  const deleteModule = async (id: string, user: AuthContext): Promise<void> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can delete modules", HTTP_STATUS.FORBIDDEN)
      }

      await getModuleById(id, user)
      
      const allRoles = await roleRepository.findAll()
      const rolesUsingModule = allRoles.filter(role => {
        const permissions = (role.attributes as any)?.roles || []
        return permissions.some((perm: any) => perm.moduleId === id)
      })
      
      if (rolesUsingModule.length > 0) {
        throw new AppError(
          `Cannot delete module: Module is referenced in ${rolesUsingModule.length} role(s). Please remove module references from roles first.`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
      
      await moduleRepository.delete(id)
    } catch (error) {
      logger.error("Error deleting module:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Lists modules with pagination (root admin only)
   * @param user - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated module list
   */
  const listModules = async (
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Module[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      if (!isRoot) {
        throw new AppError("Only root admin can list modules", HTTP_STATUS.FORBIDDEN)
      }

      const { data, total } = await moduleRepository.paginateModules(page, limit)
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    } catch (error) {
      logger.error("Error listing modules:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getModuleById,
    createModule,
    updateModule,
    deleteModule,
    listModules,
  }
}

