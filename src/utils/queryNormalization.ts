import type { ValidationError } from "joi"
import { QUERY_VALIDATION } from "../config/constants"

/**
 * Normalize entityId value
 * Converts "null" string or empty string to actual null
 * 
 * @param value - The entityId value to normalize
 * @returns Normalized value (string, null, or undefined)
 */
export const normalizeEntityId = (value: any): string | null | undefined => {
  if (QUERY_VALIDATION.ENTITY_ID_SPECIAL_VALUES.includes(value)) {
    return null
  }
  return value
}

/**
 * Normalize boolean string values
 * Converts string representations to actual booleans
 * 
 * @param value - The value to normalize
 * @returns Normalized boolean value or original value
 */
export const normalizeBoolean = (value: any): boolean | undefined => {
  if (typeof value === "boolean") {
    return value
  }
  if (typeof value === "string") {
    const trueValues = QUERY_VALIDATION.BOOLEAN_TRUE_VALUES as readonly string[]
    const falseValues = QUERY_VALIDATION.BOOLEAN_FALSE_VALUES as readonly string[]
    
    if (trueValues.includes(value)) {
      return true
    }
    if (falseValues.includes(value)) {
      return false
    }
  }
  return value
}

/**
 * Extract error messages from Joi validation errors
 * Handles custom validator messages from helpers.error()
 * 
 * @param error - Joi validation error object
 * @returns Formatted error message string
 */
export const extractErrorMessages = (error: ValidationError): string => {
  return error.details
    .map((detail) => {
      // Custom validators using helpers.error() provide message in context
      if (detail.type === "any.custom" && detail.context?.message) {
        return detail.context.message as string
      }
      return detail.message
    })
    .join(", ")
}

