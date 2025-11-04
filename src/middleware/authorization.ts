import type { Request, Response, NextFunction } from "express"
import { AppError } from "./errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"

export const authorize = (modules: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const hasPermission = modules.some((module) => {
      const permission = req.user!.permissions.find((p) => p.name === module)
      return permission && permission.write
    })

    if (!hasPermission) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, HTTP_STATUS.FORBIDDEN)
    }

    next()
  }
}

export const authorizeRead = (modules: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    const hasPermission = modules.some((module) => {
      const permission = req.user!.permissions.find((p) => p.name === module)
      return permission && (permission.read || permission.write)
    })

    if (!hasPermission) {
      throw new AppError(ERROR_MESSAGES.PERMISSION_DENIED, HTTP_STATUS.FORBIDDEN)
    }

    next()
  }
}
