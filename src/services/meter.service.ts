import { createMeterRepository } from "../repositories/meter.repository"
import type { Meter } from "../types/entities"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES, METER_TYPES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"

export const createMeterService = () => {
  const meterRepository = createMeterRepository()

  /**
   * Retrieves a meter by ID and validates access
   * @param id - Meter ID
   * @param user - Authenticated user context
   * @returns Meter object
   */
  const getMeterById = async (id: string, user: AuthContext): Promise<Meter> => {
    const meter = await meterRepository.findById(id)
    if (!meter) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    await validateEntityAccess(user.entityId, meter.entity_id, "meter")
    return meter
  }

  /**
   * Creates a new meter
   * @param entityId - Entity ID where meter will be created
   * @param name - Meter name
   * @param meterType - Meter type (PHYSICAL or VIRTUAL)
   * @param user - Authenticated user context
   * @param attributes - Optional meter attributes
   * @returns Created meter
   */
  const createMeter = async (
    entityId: string,
    name: string,
    meterType: string,
    user: AuthContext,
    attributes?: Record<string, any>,
  ): Promise<Meter> => {
    try {
      await validateEntityAccess(user.entityId, entityId, "meters")

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

  /**
   * Updates an existing meter
   * @param id - Meter ID
   * @param user - Authenticated user context
   * @param name - Optional meter name
   * @param attributes - Optional meter attributes
   * @returns Updated meter
   */
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

  /**
   * Lists meters with pagination and optional entity filter
   * @param entityId - Optional entity ID filter
   * @param user - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated meter list
   */
  const listMeters = async (
    entityId: string | null | undefined,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Meter[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      if (entityId) {
        const { data, total } = await meterRepository.paginateByEntityId(entityId, page, limit)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
      
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

  /**
   * Lists meters by entity (backward compatibility)
   * @param entityId - Entity ID
   * @param user - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated meter list
   */
  const listMetersByEntity = async (
    entityId: string,
    user: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: Meter[]; total: number; page: number; limit: number; totalPages: number }> => {
    return listMeters(entityId, user, page, limit)
  }

  /**
   * Deletes a meter
   * @param id - Meter ID
   * @param user - Authenticated user context
   */
  const deleteMeter = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getMeterById(id, user)
      const deleted = await meterRepository.delete(id)
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
