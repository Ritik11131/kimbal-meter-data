import { createBaseRepository } from "./base.repository"
import { Module } from "../models/Module"
import type { Module as ModuleType, CreateModuleDTO, UpdateModuleDTO } from "../types/entities"

export const createModuleRepository = () => {
  const baseRepo = createBaseRepository(Module)

  const findById = async (id: string): Promise<ModuleType | null> => {
    return Module.findByPk(id)
  }

  const findByName = async (name: string): Promise<ModuleType | null> => {
    return Module.findOne({ where: { name } })
  }

  const createModule = async (
    data: CreateModuleDTO,
    createdBy: string
  ): Promise<ModuleType> => {
    return Module.create({
      name: data.name,
      created_by: createdBy,
    })
  }

  const updateModule = async (id: string, data: UpdateModuleDTO): Promise<ModuleType | null> => {
    const module = await Module.findByPk(id)
    if (!module) return null

    const updateData: Partial<UpdateModuleDTO> = {}
    if (data.name !== undefined) updateData.name = data.name

    await module.update(updateData)
    return module
  }

  const findAll = async (): Promise<ModuleType[]> => {
    return Module.findAll({
      order: [["creation_time", "DESC"]],
    })
  }

  const paginateModules = async (
    page = 1,
    limit = 10
  ): Promise<{ data: ModuleType[]; total: number }> => {
    return baseRepo.paginate(page, limit, {})
  }

  return {
    ...baseRepo,
    findById,
    findByName,
    createModule,
    updateModule,
    findAll,
    paginateModules,
  }
}

