import { createMeterRepository } from "../repositories/meter.repository"
import { createEntityService } from "./entity.service"
import { createEntityRepository } from "../repositories/entity.repository"
import type { Meter, CreateMeterDTO, UpdateMeterDTO } from "../types/entities"
import type { MeterPathResponse, PathItem } from "../types/search"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES, METER_TYPES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { isRootAdmin } from "../utils/rootAdmin"

export const createMeterService = () => {
  const meterRepository = createMeterRepository()
  const entityService = createEntityService()
  const entityRepository = createEntityRepository()

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
   * @param data - Meter creation data
   * @param user - Authenticated user context
   * @returns Created meter
   */
  const createMeter = async (
    data: CreateMeterDTO,
    user: AuthContext
  ): Promise<Meter> => {
    try {
      await validateEntityAccess(user.entityId, data.entity_id, "meters")

      if (!Object.values(METER_TYPES).includes(data.meter_type)) {
        throw new AppError("Invalid meter type", HTTP_STATUS.BAD_REQUEST)
      }

      return await meterRepository.createMeter(data, user.userId)
    } catch (error) {
      logger.error("Error creating meter:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Updates an existing meter
   * @param id - Meter ID
   * @param data - Meter update data
   * @param user - Authenticated user context
   * @returns Updated meter
   */
  const updateMeter = async (
    id: string,
    data: UpdateMeterDTO,
    user: AuthContext
  ): Promise<Meter> => {
    try {
      await getMeterById(id, user)
      
      if (data.meter_type && !Object.values(METER_TYPES).includes(data.meter_type)) {
        throw new AppError("Invalid meter type", HTTP_STATUS.BAD_REQUEST)
      }
      
      const updated = await meterRepository.updateMeter(id, data)
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
   * @param search - Optional search term
   * @returns Paginated meter list
   */
  const listMeters = async (
    entityId: string | null | undefined,
    user: AuthContext,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: Meter[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      const isRoot = await isRootAdmin(user.entityId)
      let accessibleEntityIds: string[] | undefined

      if (entityId) {
        const { data, total } = await meterRepository.paginateMeters(page, limit, entityId, undefined, search)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      } else {
        if (isRoot) {
          accessibleEntityIds = undefined
        } else {
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId)
        }
        const { data, total } = await meterRepository.paginateMeters(page, limit, undefined, accessibleEntityIds, search)
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
    } catch (error) {
      logger.error("Error listing meters:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
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

  /**
   * Gets exact path from logged-in user's entity to meter (path-only, no siblings)
   * @param meterId - Meter ID
   * @param user - Authenticated user context
   * @returns Meter path response with exact path
   */
  const getMeterPathFromUserEntity = async (
    meterId: string,
    user: AuthContext
  ): Promise<MeterPathResponse> => {
    try {
      const meter = await getMeterById(meterId, user)

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      // Get entity path from user's entity to meter's entity
      const entityPath = await entityService.getEntityPathFromUserEntity(meter.entity_id, user)

      // Build complete path: entity path + meter
      const path: PathItem[] = [...entityPath.path]

      // Add meter to path
      path.push({
        id: meter.id,
        name: meter.name,
        type: "meter",
        isSelected: true,
        entityId: meter.entity_id,
      })

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "meter",
          id: meter.id,
          name: meter.name,
          entityId: meter.entity_id,
        },
        meter,
        path,
      }
    } catch (error) {
      logger.error("Error fetching meter path:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getMeterById,
    createMeter,
    updateMeter,
    listMeters,
    deleteMeter,
    getMeterPathFromUserEntity,
  }
}
