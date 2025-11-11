import type { Request, Response } from "express"
import { createModuleService } from "../services/module.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractPaginationParams } from "../utils/queryExtraction"

const moduleService = createModuleService()

export const getById = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.getModuleById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, module, "Module retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.createModule(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, module, "Module created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.updateModule(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, module, "Module updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await moduleService.deleteModule(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Module deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Query parameters are validated by validateQuery middleware
    const { page, limit } = extractPaginationParams(req)
    
    const result = await moduleService.listModules(req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Modules listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

