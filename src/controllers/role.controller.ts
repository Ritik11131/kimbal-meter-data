import type { Request, Response } from "express"
import { createRoleService } from "../services/role.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractListQueryParams } from "../utils/queryExtraction"

const roleService = createRoleService()

/**
 * Retrieves a role by ID
 * @param req - Express request object containing role ID in params
 * @param res - Express response object
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const role = await roleService.getRoleById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, role, "Role retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Creates a new role
 * @param req - Express request object containing role data (name, permissions, entityId) in body
 * @param res - Express response object
 */
export const create = async (req: Request, res: Response) => {
  try {
    const role = await roleService.createRole(req.body.name, req.body.permissions, req.body.entityId, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, role, "Role created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Updates an existing role
 * @param req - Express request object containing role ID in params and update data (name, permissions) in body
 * @param res - Express response object
 */
export const update = async (req: Request, res: Response) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.user!, req.body.name, req.body.permissions)
    sendResponse(res, HTTP_STATUS.OK, role, "Role updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Deletes a role
 * @param req - Express request object containing role ID in params
 * @param res - Express response object
 */
export const remove = async (req: Request, res: Response) => {
  try {
    await roleService.deleteRole(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Role deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Lists roles with pagination and optional entity filter
 * @param req - Express request object containing query parameters (page, limit, entityId, search)
 * @param res - Express response object
 */
export const listByEntity = async (req: Request, res: Response) => {
  try {
    const { page, limit, entityId, search } = extractListQueryParams(req)
    
    const result = await roleService.listRolesByEntity(entityId ?? null, req.user!, page, limit, search)
    sendResponse(res, HTTP_STATUS.OK, result, "Roles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
