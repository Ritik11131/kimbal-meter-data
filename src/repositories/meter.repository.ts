import { createBaseRepository } from "./base.repository"
import { Meter } from "../models/Meter"
import { Entity } from "../models/Entity"
import type { Meter as MeterType, CreateMeterDTO, UpdateMeterDTO } from "../types/entities"
import { Op } from "sequelize"
import { buildSearchCondition, hasSearchCondition } from "../utils/search"

export const createMeterRepository = () => {
  const baseRepo = createBaseRepository(Meter)

  /**
   * Finds all meters by entity ID
   * @param entityId - Entity ID
   * @returns Array of meters
   */
  const findByEntityId = async (entityId: string): Promise<MeterType[]> => {
    return Meter.findAll({
      where: { entity_id: entityId },
      order: [["creation_time", "DESC"]],
    })
  }

  /**
   * Finds meters by meter type
   * @param meterType - Meter type
   * @returns Array of meters
   */
  const findByMeterType = async (meterType: string): Promise<MeterType[]> => {
    return Meter.findAll({
      where: { meter_type: meterType },
      order: [["creation_time", "DESC"]],
    })
  }

  /**
   * Creates a new meter
   * @param data - Meter creation data
   * @param createdBy - User ID of creator
   * @returns Created meter
   */
  const createMeter = async (
    data: CreateMeterDTO,
    createdBy?: string
  ): Promise<MeterType> => {
    return Meter.create({
      entity_id: data.entity_id,
      name: data.name,
      meter_type: data.meter_type,
      tb_ref_id: data.tb_ref_id || null,
      tb_token: data.tb_token || null,
      attributes: data.attributes || null,
      created_by: createdBy || null,
    })
  }

  /**
   * Updates an existing meter
   * @param id - Meter ID
   * @param data - Meter update data
   * @returns Updated meter or null if not found
   */
  const updateMeter = async (id: string, data: UpdateMeterDTO): Promise<MeterType | null> => {
    const meter = await Meter.findByPk(id)
    if (!meter) return null

    const updateData: Partial<UpdateMeterDTO> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.meter_type !== undefined) updateData.meter_type = data.meter_type
    if (data.tb_ref_id !== undefined) updateData.tb_ref_id = data.tb_ref_id
    if (data.tb_token !== undefined) updateData.tb_token = data.tb_token
    if (data.attributes !== undefined) updateData.attributes = data.attributes

    await meter.update(updateData)
    return meter
  }

  /**
   * Finds meters accessible by a user's entity
   * @param userEntityId - User's entity ID
   * @returns Array of accessible meters
   */
  const findByAccessibleEntities = async (userEntityId: string): Promise<MeterType[]> => {
    const { getAccessibleEntityIds } = await import("../utils/hierarchy")
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    return Meter.findAll({
      where: { 
        entity_id: {
          [Op.in]: accessibleIds
        }
      },
      order: [["creation_time", "DESC"]],
    })
  }

  /**
   * Paginates meters with optional filters
   * @param page - Page number
   * @param limit - Items per page
   * @param entityId - Optional entity ID filter
   * @param accessibleEntityIds - Optional hierarchy filter
   * @param search - Optional search term
   * @returns Paginated meter data
   */
  const paginateMeters = async (
    page = 1,
    limit = 10,
    entityId?: string | null,
    accessibleEntityIds?: string[],
    search?: string
  ): Promise<{ data: MeterType[]; total: number }> => {
    const where: any = {}
    
    if (entityId !== null && entityId !== undefined) {
      where.entity_id = entityId
    } else if (accessibleEntityIds !== undefined) {
      if (accessibleEntityIds.length > 0) {
        where.entity_id = {
          [Op.in]: accessibleEntityIds
        }
      } else {
        where.id = { [Op.in]: [] }
      }
    }
    // If accessibleEntityIds is undefined, it means root admin - no filter (show all)
    
    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name"])
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
    
    // Use base repository with include option to join Entity
    const result = await baseRepo.paginate(page, limit, where, {
      include: [{
        model: Entity,
        as: "entity",
        required: false,
        attributes: ["name", "email_id"]
      }]
    })
    
    // Map results to include nested entity object
    const data = result.data.map((meter: any) => {
      const meterData = meter.toJSON ? meter.toJSON() : meter
      const { entity, ...rest } = meterData
      return {
        ...rest,
        entity: {
          name: entity?.name || null,
          email_id: entity?.email_id || null
        }
      }
    })
    
    return { data, total: result.total }
  }

  return {
    ...baseRepo,
    findByEntityId,
    findByMeterType,
    createMeter,
    updateMeter,
    findByAccessibleEntities,
    paginateMeters,
  }
}
