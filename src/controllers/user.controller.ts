import type { Request, Response } from "express"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { createUserService } from "../services/user.service"

const userService = createUserService()

export const getById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, user, "User retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, user, "User created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, user, "User updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "User deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Query parameters are validated by validateQuery middleware
    const page = typeof req.query.page === 'number' ? req.query.page : 1
    const limit = typeof req.query.limit === 'number' ? req.query.limit : 10
    const entityId = (typeof req.query.entityId === 'string' || req.query.entityId === null) ? req.query.entityId : undefined
    
    const result = await userService.listUsers(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Users listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const changePassword = async (req: Request, res: Response) => {
  try {
    await userService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword)
    sendResponse(res, HTTP_STATUS.OK, null, "Password changed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
