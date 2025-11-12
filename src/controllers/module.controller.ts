import type { Request, Response } from "express"
import { createModuleService } from "../services/module.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractPaginationParams } from "../utils/queryExtraction"

const moduleService = createModuleService()

/**
 * Retrieves a module by ID
 * @param req - Express request object containing module ID in params
 * @param res - Express response object
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.getModuleById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, module, "Module retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Creates a new module (root admin only)
 * @param req - Express request object containing module data in body
 * @param res - Express response object
 */
export const create = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.createModule(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, module, "Module created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Updates an existing module (root admin only)
 * @param req - Express request object containing module ID in params and update data in body
 * @param res - Express response object
 */
export const update = async (req: Request, res: Response) => {
  try {
    const module = await moduleService.updateModule(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, module, "Module updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Deletes a module (root admin only)
 * @param req - Express request object containing module ID in params
 * @param res - Express response object
 */
export const remove = async (req: Request, res: Response) => {
  try {
    await moduleService.deleteModule(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Module deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Lists modules with pagination (root admin only)
 * @param req - Express request object containing query parameters (page, limit)
 * @param res - Express response object
 */
export const list = async (req: Request, res: Response) => {
  try {
    const { page, limit } = extractPaginationParams(req)
    
    const result = await moduleService.listModules(req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Modules listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

