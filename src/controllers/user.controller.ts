import type { Request, Response } from "express"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { createUserService } from "../services/user.service"
import { extractListQueryParams } from "../utils/queryExtraction"

const userService = createUserService()

/**
 * Retrieves a user by ID
 * @param req - Express request object containing user ID in params
 * @param res - Express response object
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, user, "User retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Creates a new user
 * @param req - Express request object containing user data in body
 * @param res - Express response object
 */
export const create = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, user, "User created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Updates an existing user
 * @param req - Express request object containing user ID in params and update data in body
 * @param res - Express response object
 */
export const update = async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, user, "User updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Deletes a user
 * @param req - Express request object containing user ID in params
 * @param res - Express response object
 */
export const remove = async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "User deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Lists users with pagination and optional entity filter
 * @param req - Express request object containing query parameters (page, limit, entityId)
 * @param res - Express response object
 */
export const list = async (req: Request, res: Response) => {
  try {
    const { page, limit, entityId } = extractListQueryParams(req)
    
    const result = await userService.listUsers(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Users listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Changes the password for the authenticated user
 * @param req - Express request object containing currentPassword and newPassword in body
 * @param res - Express response object
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    await userService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword)
    sendResponse(res, HTTP_STATUS.OK, null, "Password changed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
