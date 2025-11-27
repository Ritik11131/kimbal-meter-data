import type { Request, Response, NextFunction } from "express"
import { sendError } from "./response"
import { HTTP_STATUS } from "../config/constants"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validates UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  return UUID_REGEX.test(uuid)
}

/**
 * Middleware to validate UUID route parameters
 * Validates all UUID parameters in req.params
 */
export const validateUUIDParams = (paramNames?: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramsToValidate = paramNames || Object.keys(req.params)
    
    for (const paramName of paramsToValidate) {
      const paramValue = req.params[paramName]
      // Only validate if paramValue exists and is not empty
      if (paramValue && paramValue.trim() !== "" && !isValidUUID(paramValue)) {
        sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Invalid UUID format for parameter: ${paramName}. Expected a valid UUID, got: ${paramValue}`,
          req.path
        )
        return
      }
    }
    
    next()
  }
}

/**
 * Validates a single UUID value
 */
export const validateUUID = (value: string, fieldName: string = "id"): void => {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid UUID format for ${fieldName}`)
  }
}

