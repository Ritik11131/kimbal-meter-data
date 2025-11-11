import type { Request, Response, NextFunction } from "express"
import { AppError } from "./errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"

/**
 * Middleware to require WRITE permission for a module
 * Used for POST, PATCH, DELETE operations
 * 
 * @param modules - Array of module names that require write permission
 * @returns Express middleware function
 * 
 * @example
 * router.post("/", authenticate, requireWritePermission([MODULES.ENTITY]), ...)
 * router.patch("/:id", authenticate, requireWritePermission([MODULES.USER]), ...)
 * router.delete("/:id", authenticate, requireWritePermission([MODULES.METER]), ...)
 */
export const requireWritePermission = (modules: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
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

/**
 * Middleware to require READ permission for a module
 * Allows users with either read OR write permission
 * Used for GET operations
 * 
 * @param modules - Array of module names that require read permission
 * @returns Express middleware function
 * 
 * @example
 * router.get("/", authenticate, requireReadPermission([MODULES.ENTITY]), ...)
 * router.get("/:id", authenticate, requireReadPermission([MODULES.USER]), ...)
 */
export const requireReadPermission = (modules: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
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

/**
 * @deprecated Use requireWritePermission instead
 * Kept for backward compatibility during migration
 */
export const authorize = requireWritePermission

/**
 * @deprecated Use requireReadPermission instead
 * Kept for backward compatibility during migration
 */
export const authorizeRead = requireReadPermission
