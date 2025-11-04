import type { Request, Response, NextFunction } from "express"
import { sendError } from "../utils/response"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Error:", error)

  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, req.path)
  }

  if (error.name === "UnauthorizedError") {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, ERROR_MESSAGES.UNAUTHORIZED, req.path)
  }

  if (error.message.includes("jwt")) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, "Invalid token", req.path)
  }

  return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.DATABASE_ERROR, req.path)
}
