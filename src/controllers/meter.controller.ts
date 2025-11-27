import type { Request, Response } from "express"
import { createMeterService } from "../services/meter.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractListQueryParams } from "../utils/queryExtraction"

const meterService = createMeterService()

/**
 * Retrieves a meter by ID
 * @param req - Express request object containing meter ID in params
 * @param res - Express response object
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const meter = await meterService.getMeterById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Creates a new meter
 * @param req - Express request object containing meter data (entityId, name, meterType, attributes) in body
 * @param res - Express response object
 */
export const create = async (req: Request, res: Response) => {
  try {
    const meter = await meterService.createMeter(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, meter, "Meter created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Updates an existing meter
 * @param req - Express request object containing meter ID in params and update data (name, attributes) in body
 * @param res - Express response object
 */
export const update = async (req: Request, res: Response) => {
  try {
    const meter = await meterService.updateMeter(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Lists meters with pagination and optional entity filter
 * @param req - Express request object containing query parameters (page, limit, entityId, search)
 * @param res - Express response object
 */
export const list = async (req: Request, res: Response) => {
  try {
    const { page, limit, entityId, search } = extractListQueryParams(req)
    
    const result = await meterService.listMeters(entityId, req.user!, page, limit, search)
    sendResponse(res, HTTP_STATUS.OK, result, "Meters listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Deletes a meter
 * @param req - Express request object containing meter ID in params
 * @param res - Express response object
 */
export const remove = async (req: Request, res: Response) => {
  try {
    await meterService.deleteMeter(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Meter deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
