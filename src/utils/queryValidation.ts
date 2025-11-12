import { isValidUUID } from "./uuidValidation"
import { QUERY_VALIDATION } from "../config/constants"

/**
 * Create user-friendly entityId error message
 * 
 * @param invalidValue - The invalid value that was provided
 * @returns Formatted error message
 */
export const createEntityIdErrorMessage = (invalidValue: string): string => {
  return `Invalid entityId format. The value "${invalidValue}" is not a valid UUID. Please provide a valid UUID (e.g., "123e4567-e89b-12d3-a456-426614174000"), the string "null", or leave it empty.`
}

/**
 * Validate entityId value using existing isValidUUID utility
 * Allows: valid UUID, "null" string, empty string, or undefined/null
 * 
 * This is used in Joi custom validators - cannot use sendError() here
 * because Joi custom validators don't have access to Express Response object.
 * Errors are handled by validateQuery middleware.
 * 
 * @param value - The value to validate
 * @param helpers - Joi helpers object for creating errors
 * @returns The validated value or a Joi error
 */
export const validateEntityId = (value: any, helpers: any): any => {
  // Allow undefined/null (field is optional)
  if (value === undefined || value === null) {
    return value
  }

  // Allow empty string or "null" string (will be converted to null later)
  if (QUERY_VALIDATION.ENTITY_ID_SPECIAL_VALUES.includes(value)) {
    return value
  }

  // Use existing utility function instead of duplicating regex
  if (isValidUUID(value)) {
    return value
  }

  // Invalid UUID format - use Joi's error helper
  // The error will be caught by validateQuery middleware which has access to res
  // and will call sendError() to send the HTTP response
  return helpers.error("any.custom", {
    message: createEntityIdErrorMessage(value),
  })
}

