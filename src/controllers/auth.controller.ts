import type { Request, Response } from "express"
import { createAuthService } from "../services/auth.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

const authService = createAuthService()

export const login = async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body)
    sendResponse(res, HTTP_STATUS.OK, result, "Login successful", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body)
    sendResponse(res, HTTP_STATUS.CREATED, result, "User registered successfully", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

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
