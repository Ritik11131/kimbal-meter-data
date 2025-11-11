import type { Request, Response } from "express"
import { createAuthService } from "../services/auth.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

const authService = createAuthService()

/**
 * Authenticates a user and returns a JWT token
 * @param req - Express request object containing email and password in body
 * @param res - Express response object
 */
export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body)
    sendResponse(res, HTTP_STATUS.OK, result, "Login successful", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Registers a new user
 * @param req - Express request object containing user registration data in body
 * @param res - Express response object
 */
export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body)
    sendResponse(res, HTTP_STATUS.CREATED, result, "User registered successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param req - Express request object containing token in Authorization header
 * @param res - Express response object
 */
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) {
      sendError(res, HTTP_STATUS.UNAUTHORIZED, "No token provided", req.path)
      return
    }

    const payload = authService.verifyToken(token)
    sendResponse(res, HTTP_STATUS.OK, payload, "Token valid", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}
