import type { Request, Response } from "express"
import { createEntityService } from "../services/entity.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { AppError } from "../middleware/errorHandler"

const entityService = createEntityService()

export const getById = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.getEntityById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, entity, "Entity retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const getHierarchy = async (req: Request, res: Response) => {
  try {
    // Parse optional query parameters for optimization
    const depth = req.query.depth ? Number(req.query.depth) : undefined
    const page = req.query.page ? Number(req.query.page) : undefined
    const limit = req.query.limit ? Number(req.query.limit) : undefined
    const paginateRootChildren = req.query.paginateRootChildren === 'true' || req.query.paginateRootChildren === '1'
    
    // Validate pagination parameters
    if (paginateRootChildren) {
      if (!page || page < 1) {
        throw new AppError('page parameter is required when paginateRootChildren is true', HTTP_STATUS.BAD_REQUEST)
      }
      if (!limit || limit < 1) {
        throw new AppError('limit parameter is required when paginateRootChildren is true', HTTP_STATUS.BAD_REQUEST)
      }
    }
    
    const options = {
      depth,
      page,
      limit,
      paginateRootChildren,
    }
    
    const hierarchy = await entityService.getEntityHierarchy(req.params.id, req.user!, options)
    sendResponse(res, HTTP_STATUS.OK, hierarchy, "Entity hierarchy retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.createEntity(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, entity, "Entity created successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const entity = await entityService.updateEntity(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, entity, "Entity updated successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await entityService.deleteEntity(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Entity deleted successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const profileId = req.query.profileId as string | undefined
    // Handle query param: "null" string, empty string, undefined, or actual entity ID
    let entityId: string | null | undefined = req.query.entityId as string | undefined
    
    // Convert string "null" or empty string to actual null
    if (entityId === "null" || entityId === "" || entityId === undefined) {
      entityId = null
    }

    const result = await entityService.listEntities(page, limit, profileId, entityId, req.user!)
    sendResponse(res, HTTP_STATUS.OK, result, "Entities listed successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}
