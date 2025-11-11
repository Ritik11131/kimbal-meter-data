import type { Request, Response, NextFunction } from "express"
import { JwtUtil } from "../utils/jwt"
import { AppError } from "./errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
// Express Request extension is defined in src/types/common.ts

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const token = authHeader.slice(7)
    const payload = JwtUtil.verify(token)

    req.user = {
      userId: payload.userId,
      entityId: payload.entityId,
      roleId: payload.roleId,
      email: payload.email,
      permissions: payload.permissions,
    }

    req.token = token
    next()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }
}
