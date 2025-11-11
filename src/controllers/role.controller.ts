import type { Request, Response } from "express"
import { createRoleService } from "../services/role.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

const roleService = createRoleService()

export const getById = async (req: Request, res: Response) => {
  try {
    const role = await roleService.getRoleById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, role, "Role retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const role = await roleService.createRole(req.body.name, req.body.permissions, req.body.entityId, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, role, "Role created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.user!, req.body.name, req.body.permissions)
    sendResponse(res, HTTP_STATUS.OK, role, "Role updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await roleService.deleteRole(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Role deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const listByEntity = async (req: Request, res: Response) => {
  try {
    // Query parameters are validated by validateQuery middleware
    const page = typeof req.query.page === 'number' ? req.query.page : 1
    const limit = typeof req.query.limit === 'number' ? req.query.limit : 10
    const entityId = (typeof req.query.entityId === 'string' || req.query.entityId === null) ? req.query.entityId : null
    
    const result = await roleService.listRolesByEntity(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Roles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
