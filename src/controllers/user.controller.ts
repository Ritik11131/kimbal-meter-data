import type { Request, Response } from "express"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { AppError } from "../middleware/errorHandler"
import { createUserService } from "../services/user.service"
import { isValidUUID } from "../utils/uuidValidation"

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
    // Validate and parse pagination parameters
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 10
    
    // Validate page and limit
    if (page < 1 || !Number.isInteger(page)) {
      throw new AppError('page parameter must be a positive integer', HTTP_STATUS.BAD_REQUEST)
    }
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      throw new AppError('limit parameter must be between 1 and 100', HTTP_STATUS.BAD_REQUEST)
    }

    // Handle query param: "null" string, empty string, undefined, or actual entity ID
    let entityId: string | null | undefined = req.query.entityId as string | undefined
    
    // Convert string "null" or empty string to actual null
    if (entityId === "null" || entityId === "" || entityId === undefined) {
      entityId = null
    } else if (entityId && !isValidUUID(entityId)) {
      throw new AppError('entityId parameter must be a valid UUID', HTTP_STATUS.BAD_REQUEST)
    }
    
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
