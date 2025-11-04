import type { Request, Response } from "express"
import { createMeterService } from "../services/meter.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

const meterService = createMeterService()

export const getById = async (req: Request, res: Response) => {
  try {
    const meter = await meterService.getMeterById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter retrieved successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const { entityId, name, meterType, attributes } = req.body
    const meter = await meterService.createMeter(entityId, name, meterType, req.user!, attributes)
    sendResponse(res, HTTP_STATUS.CREATED, meter, "Meter created successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const { name, attributes } = req.body
    const meter = await meterService.updateMeter(req.params.id, req.user!, name, attributes)
    sendResponse(res, HTTP_STATUS.OK, meter, "Meter updated successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const listByEntity = async (req: Request, res: Response) => {
  try {
    const meters = await meterService.listMetersByEntity(req.params.entityId, req.user!)
    sendResponse(res, HTTP_STATUS.OK, meters, "Meters listed successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}
