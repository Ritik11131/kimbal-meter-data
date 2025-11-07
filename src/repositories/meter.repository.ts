import { createBaseRepository } from "./base.repository"
import { Meter } from "../models/Meter" // Your Sequelize Meter model class
import type { Meter as MeterType } from "../types/entities" // Meter interface/type if any
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

export const createMeterRepository = () => {
  const baseRepo = createBaseRepository(Meter)

  const findByEntityId = async (entityId: string): Promise<MeterType[]> => {
    return Meter.findAll({
      where: { entity_id: entityId },
      order: [["creation_time", "DESC"]],
    })
  }

  const paginateByEntityId = async (
    entityId: string,
    page = 1,
    limit = 10
  ): Promise<{ data: MeterType[]; total: number }> => {
    return baseRepo.paginate(page, limit, { entity_id: entityId })
  }

  const findByMeterType = async (meterType: string): Promise<MeterType[]> => {
    return Meter.findAll({
      where: { meter_type: meterType },
      order: [["creation_time", "DESC"]],
    })
  }

  const createMeter = async (
    entityId: string,
    name: string,
    meterType: string,
    createdBy: string,
    tbRefId?: string,
    tbToken?: string,
    attributes?: Record<string, any>
  ): Promise<Meter> => {
    return Meter.create({
      entity_id: entityId,
      name,
      meter_type: meterType,
      tb_ref_id: tbRefId || null,
      tb_token: tbToken || null,
      attributes: attributes || null,
      created_by: createdBy,
    })
  }

  const updateMeter = async (id: string, data: Partial<MeterType>): Promise<Meter | null> => {
    const meter = await Meter.findByPk(id)
    if (!meter) return null

    const updateData: Partial<MeterType> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.meter_type !== undefined) updateData.meter_type = data.meter_type
    if (data.tb_ref_id !== undefined) updateData.tb_ref_id = data.tb_ref_id
    if (data.tb_token !== undefined) updateData.tb_token = data.tb_token
    if (data.attributes !== undefined) updateData.attributes = data.attributes

    await meter.update(updateData)
    return meter
  }

  const findByAccessibleEntities = async (userEntityId: string): Promise<MeterType[]> => {
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

  const paginateByAccessibleEntities = async (
    accessibleEntityIds: string[],
    page = 1,
    limit = 10
  ): Promise<{ data: MeterType[]; total: number }> => {
    const where: any = {}
    
    if (accessibleEntityIds.length > 0) {
      where.entity_id = {
        [Op.in]: accessibleEntityIds
      }
    } else {
      // Empty array means no accessible entities - return empty result
      where.id = { [Op.in]: [] }
    }
    
    return baseRepo.paginate(page, limit, where)
  }

  const deleteMeter = async (id: string): Promise<number> => {
    const deleted = await Meter.destroy({ where: { id } })
    return deleted
  }

  return {
    ...baseRepo,
    findByEntityId,
    paginateByEntityId,
    findByMeterType,
    createMeter,
    updateMeter,
    findByAccessibleEntities,
    paginateByAccessibleEntities,
    deleteMeter,
  }
}
