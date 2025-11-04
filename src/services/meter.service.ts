import { createMeterRepository } from "../repositories/meter.repository"
import type { Meter } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES, METER_TYPES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess } from "../utils/hierarchy"

export const createMeterService = () => {
  const meterRepository = createMeterRepository()

  const getMeterById = async (id: string, user: AuthContext): Promise<Meter> => {
    const meter = await meterRepository.findById(id)
    if (!meter) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    // Validate user has access to the meter's entity
    await validateEntityAccess(user.entityId, meter.entity_id)
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
      await validateEntityAccess(user.entityId, entityId)

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

  const listMetersByEntity = async (entityId: string, user: AuthContext): Promise<Meter[]> => {
    try {
      // Validate user can access the entity
      await validateEntityAccess(user.entityId, entityId)
      return await meterRepository.findByEntityId(entityId)
    } catch (error) {
      logger.error("Error listing meters:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getMeterById,
    createMeter,
    updateMeter,
    listMetersByEntity,
  }
}
