import { createBaseRepository } from "./base.repository"
import { Module } from "../models/Module"
import type { Module as ModuleType, CreateModuleDTO, UpdateModuleDTO } from "../types/entities"
import { buildSearchCondition, hasSearchCondition } from "../utils/search"

export const createModuleRepository = () => {
  const baseRepo = createBaseRepository(Module)

  /**
   * Finds a module by name
   * @param name - Module name
   * @returns Module or null if not found
   */
  const findByName = async (name: string): Promise<ModuleType | null> => {
    return Module.findOne({ where: { name } })
  }

  /**
   * Creates a new module
   * @param data - Module creation data
   * @param createdBy - User ID of creator
   * @returns Created module
   */
  const createModule = async (
    data: CreateModuleDTO,
    createdBy: string
  ): Promise<ModuleType> => {
    return Module.create({
      name: data.name,
      created_by: createdBy,
    })
  }

  /**
   * Updates an existing module
   * @param id - Module ID
   * @param data - Module update data
   * @returns Updated module or null if not found
   */
  const updateModule = async (id: string, data: UpdateModuleDTO): Promise<ModuleType | null> => {
    const module = await Module.findByPk(id)
    if (!module) return null

    const updateData: Partial<UpdateModuleDTO> = {}
    if (data.name !== undefined) updateData.name = data.name

    await module.update(updateData)
    return module
  }

  /**
   * Paginates modules
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated module data
   */
  const paginateModules = async (
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: ModuleType[]; total: number }> => {
    const where: any = {}
    
    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name"])
    if (hasSearchCondition(searchCondition)) {
      // Module repository has no existing conditions, so just use search directly
      Object.assign(where, searchCondition)
    }
    
    return baseRepo.paginate(page, limit, where)
  }

  return {
    ...baseRepo,
    findByName,
    createModule,
    updateModule,
    paginateModules,
  }
}

