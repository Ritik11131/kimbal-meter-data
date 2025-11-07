import type { Request, Response } from "express"
import { createMeterService } from "../services/meter.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { isValidUUID } from "../utils/uuidValidation"

const meterService = createMeterService()

export const getById = async (req: Request, res: Response) => {
  try {
    const meter = await meterService.getMeterById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter retrieved successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { entityId, name, meterType, attributes } = req.body
    const meter = await meterService.createMeter(entityId, name, meterType, req.user!, attributes)
    sendResponse(res, HTTP_STATUS.CREATED, meter, "Meter created successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { name, attributes } = req.body
    const meter = await meterService.updateMeter(req.params.id, req.user!, name, attributes)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter updated successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Validate and parse pagination parameters
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 10
    
    // Validate page and limit
    if (page < 1 || !Number.isInteger(page)) {
      throw new Error('page parameter must be a positive integer')
    }
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      throw new Error('limit parameter must be between 1 and 100')
    }

    // Handle query param: "null" string, empty string, undefined, or actual entity ID
    let entityId: string | null | undefined = req.query.entityId as string | undefined
    
    // Convert string "null" or empty string to actual null
    if (entityId === "null" || entityId === "" || entityId === undefined) {
      entityId = null
    } else if (entityId && !isValidUUID(entityId)) {
      throw new Error('entityId parameter must be a valid UUID')
    }
    
    const result = await meterService.listMeters(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Meters listed successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await meterService.deleteMeter(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Meter deleted successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
