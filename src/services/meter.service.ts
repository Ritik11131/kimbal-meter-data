import { createMeterRepository } from "../repositories/meter.repository"
import type { Meter } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES, METER_TYPES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"

export const createMeterService = () => {
  const meterRepository = createMeterRepository()

  const getMeterById = async (id: string, user: AuthContext): Promise<Meter> => {
    const meter = await meterRepository.findById(id)
    if (!meter) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    // Validate user has access to the meter's entity
    await validateEntityAccess(user.entityId, meter.entity_id, "meter")
    return meter
  }

  const createMeter = async (
    entityId: string,
    name: string,
    meterType: string,
    user: AuthContext,
    attributes?: Record<string, any>,
  ): Promise<Meter> => {
    try {
      // Validate user can access the entity where meter will be created
      await validateEntityAccess(user.entityId, entityId, "meters")

      // Validate meter type
      if (!Object.values(METER_TYPES).includes(meterType as any)) {
        throw new AppError("Invalid meter type", HTTP_STATUS.BAD_REQUEST)
      }

      return await meterRepository.createMeter(entityId, name, meterType as any, user.userId, undefined, undefined, attributes)
    } catch (error) {
      logger.error("Error creating meter:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const updateMeter = async (id: string, user: AuthContext, name?: string, attributes?: Record<string, any>): Promise<Meter> => {
    try {
      await getMeterById(id, user)
      const updated = await meterRepository.updateMeter(id, { name, attributes })
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      return updated
    } catch (error) {
      logger.error("Error updating meter:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const listMeters = async (
    entityId: string | null | undefined,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Meter[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      // If entityId is provided, validate access and list meters for that entity
      if (entityId) {
        await validateEntityAccess(user.entityId, entityId, "meters")
        const { data, total } = await meterRepository.paginateByEntityId(entityId, page, limit)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
      
      // If no entityId, list all meters from accessible entities
      const accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
      const { data, total } = await meterRepository.paginateByAccessibleEntities(accessibleEntityIds, page, limit)
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    } catch (error) {
      logger.error("Error listing meters:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  // Keep old method for backward compatibility (if needed)
  const listMetersByEntity = async (
    entityId: string,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Meter[]; total: number; page: number; limit: number; totalPages: number }> => {
    return listMeters(entityId, user, page, limit)
  }

  const deleteMeter = async (id: string, user: AuthContext): Promise<void> => {
    try {
      // Validate access before deleting
      await getMeterById(id, user)
      const deleted = await meterRepository.deleteMeter(id)
      if (deleted === 0) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
    } catch (error) {
      logger.error("Error deleting meter:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getMeterById,
    createMeter,
    updateMeter,
    listMeters,
    listMetersByEntity,
    deleteMeter,
  }
}
