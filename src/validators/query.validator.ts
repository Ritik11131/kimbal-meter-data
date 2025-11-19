import Joi from "joi"
import type { Request, Response, NextFunction } from "express"
import { sendError } from "../utils/response"
import { HTTP_STATUS, QUERY_VALIDATION } from "../config/constants"
import { validateEntityId } from "../utils/queryValidation"
import { normalizeEntityId, normalizeBoolean, extractErrorMessages } from "../utils/queryNormalization"

/**
 * Reusable pagination schema - page and limit are required
 */
const paginationSchema = {
  page: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_PAGE)
    .required()
    .messages({
      "number.base": "page must be a number",
      "number.integer": "page must be an integer",
      "number.min": `page must be at least ${QUERY_VALIDATION.PAGINATION.MIN_PAGE}`,
      "any.required": "page is required",
    }),
  limit: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_LIMIT)
    .max(QUERY_VALIDATION.PAGINATION.MAX_LIMIT)
    .required()
    .messages({
      "number.base": "limit must be a number",
      "number.integer": "limit must be an integer",
      "number.min": `limit must be at least ${QUERY_VALIDATION.PAGINATION.MIN_LIMIT}`,
      "number.max": `limit must be at most ${QUERY_VALIDATION.PAGINATION.MAX_LIMIT}`,
      "any.required": "limit is required",
    }),
  search: Joi.string()
    .optional()
    .allow("")
    .max(255)
    .messages({
      "string.base": "search must be a string",
      "string.max": "search must be at most 255 characters",
    }),
} as const

/**
 * Reusable entityId validator
 */
const entityIdValidator = Joi.string()
  .optional()
  .custom(validateEntityId)

/**
 * Helper function to create list query schema
 * Reduces code duplication across list endpoints
 * 
 * @param options - Configuration options
 * @param options.includeEntityId - Whether to include entityId validator (default: true)
 * @param options.additionalFields - Optional additional fields to add to the schema
 * @returns Joi schema object
 */
const createListQuerySchema = (options?: {
  includeEntityId?: boolean
  additionalFields?: Record<string, Joi.Schema>
}) => {
  const includeEntityId = options?.includeEntityId !== false // Default to true
  const additionalFields = options?.additionalFields || {}
  
  const baseSchema = includeEntityId
    ? { ...paginationSchema, entityId: entityIdValidator }
    : { ...paginationSchema }
  
  return Joi.object({ ...baseSchema, ...additionalFields })
}

/**
 * Schema for pagination query parameters (page and limit required)
 */
export const paginationQuerySchema = Joi.object({
  ...paginationSchema,
})

/**
 * Schema for entity hierarchy query parameters
 */
export const hierarchyQuerySchema = Joi.object({
  depth: Joi.number().integer().min(QUERY_VALIDATION.PAGINATION.MIN_PAGE).optional(),
  page: Joi.number().integer().min(QUERY_VALIDATION.PAGINATION.MIN_PAGE).optional(),
  limit: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_LIMIT)
    .max(QUERY_VALIDATION.PAGINATION.MAX_LIMIT)
    .optional(),
  paginateRootChildren: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid(...QUERY_VALIDATION.BOOLEAN_TRUE_VALUES, ...QUERY_VALIDATION.BOOLEAN_FALSE_VALUES)
    )
    .optional(),
  search: Joi.string()
    .optional()
    .allow("")
    .max(255)
    .messages({
      "string.base": "search must be a string",
      "string.max": "search must be at most 255 characters",
    }),
})

/**
 * Schema for entity list query parameters
 */
export const entityListQuerySchema = createListQuerySchema({
  additionalFields: {
    profileId: Joi.string().uuid().optional(),
  },
})

/**
 * Schema for profile list query parameters
 */
export const profileListQuerySchema = createListQuerySchema()

/**
 * Schema for role list query parameters
 */
export const roleListQuerySchema = createListQuerySchema()

/**
 * Schema for user list query parameters
 */
export const userListQuerySchema = createListQuerySchema()

/**
 * Schema for meter list query parameters
 */
export const meterListQuerySchema = createListQuerySchema()

/**
 * Schema for module list query parameters
 * Modules are system-wide (no entity_id), so entityId filter is not included
 */
export const moduleListQuerySchema = createListQuerySchema({
  includeEntityId: false,
})

/**
 * Validate query parameters using Joi schema
 * Follows the same pattern as validate() in utils/validation.ts
 * 
 * This middleware:
 * 1. Validates query parameters against the provided schema
 * 2. Normalizes values (entityId "null" strings, boolean strings)
 * 3. Returns formatted error messages on validation failure
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    })

    if (error) {
      const messages = extractErrorMessages(error)
      sendError(res, HTTP_STATUS.BAD_REQUEST, messages, req.path)
      return
    }

    // Normalize values after validation
    if (value.entityId !== undefined) {
      value.entityId = normalizeEntityId(value.entityId)
    }

    if (value.paginateRootChildren !== undefined) {
      value.paginateRootChildren = normalizeBoolean(value.paginateRootChildren)
    }

    req.query = value
    next()
  }
}
