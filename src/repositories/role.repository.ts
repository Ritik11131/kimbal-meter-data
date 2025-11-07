import { createBaseRepository } from "./base.repository"
import { Role } from "../models/Role"
import type { Role as RoleType } from "../types/entities"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

export const createRoleRepository = () => {
  const baseRepo = createBaseRepository(Role)

  const findByEntityId = async (entityId?: string | null): Promise<RoleType[]> => {
    const whereClause = entityId === null ? { entity_id: null } : entityId ? { entity_id: entityId } : {}

    const roles = await Role.findAll({
      where: whereClause,
      order: [["creation_time", "DESC"]],
    })

    // Map Sequelize model instances to your typed Role objects,
    // carefully handling the attributes field to ensure correct typing

    return roles.map(roleInstance => ({
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          : { roles: [] }, // provide default shape if absent
    })) as RoleType[]
  }

  // Similar transformation should be applied to findById and updateRole return values:

  const findById = async (id: string): Promise<RoleType | null> => {
    const roleInstance = await Role.findByPk(id)
    if (!roleInstance) return null
    return {
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          : { roles: [] },
    }
  }

  const updateRole = async (id: string, data: Partial<RoleType>): Promise<RoleType | null> => {
    const roleInstance = await Role.findByPk(id)
    if (!roleInstance) return null

    await roleInstance.update(data)

    return {
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          : { roles: [] },
    }
  }

  // createRole usually returns the model instance directly; map similarly if needed:

  const createRole = async (
    name: string,
    entityId: string | null,
    attributes?: RoleType["attributes"],
    createdBy?: string
  ): Promise<RoleType> => {
    const roleInstance = await Role.create({
      name,
      entity_id: entityId || null,
      attributes,
      created_by: createdBy || null,
    })

    return {
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          :       { roles: [] },
    }
  }

  const findByAccessibleEntities = async (userEntityId: string): Promise<RoleType[]> => {
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    const roles = await Role.findAll({
      where: { 
        entity_id: {
          [Op.in]: accessibleIds
        }
      },
      order: [["creation_time", "DESC"]],
    })
    return roles.map(roleInstance => ({
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          : { roles: [] },
    })) as RoleType[]
  }

  const findAll = async (): Promise<RoleType[]> => {
    const roles = await Role.findAll({
      order: [["creation_time", "DESC"]],
    })
    return roles.map(roleInstance => ({
      ...roleInstance.get(),
      attributes:
        typeof roleInstance.attributes === "object" && roleInstance.attributes !== null
          ? (roleInstance.attributes as RoleType["attributes"])
          : { roles: [] },
    })) as RoleType[]
  }

  const paginateRoles = async (
    page = 1,
    limit = 10,
    entityId?: string | null,
    accessibleEntityIds?: string[]
  ): Promise<{ data: RoleType[]; total: number }> => {
    const where: any = {}
    
    if (entityId !== null && entityId !== undefined) {
      // Specific entity ID requested
      where.entity_id = entityId === null ? null : entityId
    } else if (accessibleEntityIds !== undefined) {
      // Filter by accessible entities (non-root users)
      if (accessibleEntityIds.length > 0) {
        where.entity_id = {
          [Op.in]: accessibleEntityIds
        }
      } else {
        // Empty array means no accessible entities - return empty result
        where.id = { [Op.in]: [] }
      }
    }
    // If accessibleEntityIds is undefined, it means root admin - no filter (show all)
    
    const { data, total } = await baseRepo.paginate(page, limit, where)
    
    // Map Sequelize instances to typed Role objects
    const mappedData = data.map(roleInstance => ({
      ...(roleInstance as any).get ? (roleInstance as any).get() : roleInstance,
      attributes:
        typeof (roleInstance as any).attributes === "object" && (roleInstance as any).attributes !== null
          ? ((roleInstance as any).attributes as RoleType["attributes"])
          : { roles: [] },
    })) as RoleType[]
    
    return { data: mappedData, total }
  }

  return {
    ...baseRepo,
    findByEntityId,
    findById,
    createRole,
    updateRole,
    findByAccessibleEntities,
    findAll,
    paginateRoles,
  }
}
