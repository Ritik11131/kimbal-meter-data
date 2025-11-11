import type { Request, Response } from "express"
import { createEntityService } from "../services/entity.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { AppError } from "../middleware/errorHandler"
import { extractQueryParams } from "../utils/queryExtraction"

const entityService = createEntityService()

export const getById = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.getEntityById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, entity, "Entity retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const getHierarchy = async (req: Request, res: Response) => {
  try {
    // Query parameters are validated by validateQuery middleware
    const extracted = extractQueryParams(req, {
      defaultPage: undefined,
      defaultLimit: undefined,
      customFields: ['depth', 'paginateRootChildren'],
    })
    
    const depth = extracted.depth as number | undefined
    const page = extracted.page as number | undefined
    const limit = extracted.limit as number | undefined
    const paginateRootChildren = extracted.paginateRootChildren as boolean | undefined
    
    // Validate pagination parameters when paginateRootChildren is true
    if (paginateRootChildren) {
      if (!page || page < 1) {
        throw new AppError('page parameter is required when paginateRootChildren is true', HTTP_STATUS.BAD_REQUEST)
      }
      if (!limit || limit < 1 || limit > 100) {
        throw new AppError('limit parameter is required and must be between 1 and 100 when paginateRootChildren is true', HTTP_STATUS.BAD_REQUEST)
      }
    }
    
    const options = {
      depth,
      page,
      limit,
      paginateRootChildren: paginateRootChildren || false,
    }
    
    const hierarchy = await entityService.getEntityHierarchy(req.params.id, req.user!, options)
    sendResponse(res, HTTP_STATUS.OK, hierarchy, "Entity hierarchy retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.createEntity(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, entity, "Entity created successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.updateEntity(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, entity, "Entity updated successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await entityService.deleteEntity(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Entity deleted successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Query parameters are validated by validateQuery middleware
    const { page, limit, entityId, profileId } = extractQueryParams(req, {
      includeEntityId: true,
      customFields: ['profileId'],
    })

    const result = await entityService.listEntities(page, limit, profileId, entityId, req.user!)
    sendResponse(res, HTTP_STATUS.OK, result, "Entities listed successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
