import type { Request, Response } from "express"
import { createMeterService } from "../services/meter.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractListQueryParams } from "../utils/queryExtraction"

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
    // Query parameters are validated by validateQuery middleware
    const { page, limit, entityId } = extractListQueryParams(req)
    
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
