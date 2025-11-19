import Joi from "joi"
import { QUERY_VALIDATION } from "../config/constants"

/**
 * Search resource type enum
 */
export const searchResourceTypeSchema = Joi.string()
  .valid("entity", "user", "profile", "role")
  .messages({
    "any.only": "type must be one of: entity, user, profile, role",
  })

/**
 * Global search query schema
 */
export const globalSearchQuerySchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      "string.base": "q must be a string",
      "string.min": "q must be at least 1 character",
      "string.max": "q must be at most 255 characters",
      "any.required": "q is required",
    }),
  type: Joi.alternatives()
    .try(
      searchResourceTypeSchema,
      Joi.string().custom((value, helpers) => {
        // Handle comma-separated types like "entity,user"
        const types = value.split(",").map((t: string) => t.trim())
        const validTypes = ["entity", "user", "profile", "role"]
        const invalidTypes = types.filter((t: string) => !validTypes.includes(t))
        if (invalidTypes.length > 0) {
          return helpers.error("any.invalid", { message: `Invalid types: ${invalidTypes.join(", ")}` })
        }
        return types
      })
    )
    .optional()
    .messages({
      "any.invalid": "type contains invalid resource types",
    }),
  page: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_PAGE)
    .optional()
    .default(1)
    .messages({
      "number.base": "page must be a number",
      "number.integer": "page must be an integer",
      "number.min": `page must be at least ${QUERY_VALIDATION.PAGINATION.MIN_PAGE}`,
    }),
  limit: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_LIMIT)
    .max(QUERY_VALIDATION.PAGINATION.MAX_LIMIT)
    .optional()
    .default(10)
    .messages({
      "number.base": "limit must be a number",
      "number.integer": "limit must be an integer",
      "number.min": `limit must be at least ${QUERY_VALIDATION.PAGINATION.MIN_LIMIT}`,
      "number.max": `limit must be at most ${QUERY_VALIDATION.PAGINATION.MAX_LIMIT}`,
    }),
})

/**
 * Hierarchy query schema
 */
export const hierarchyQuerySchema = Joi.object({
  depth: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      "number.base": "depth must be a number",
      "number.integer": "depth must be an integer",
      "number.min": "depth must be at least 1",
    }),
  page: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_PAGE)
    .optional()
    .messages({
      "number.base": "page must be a number",
      "number.integer": "page must be an integer",
      "number.min": `page must be at least ${QUERY_VALIDATION.PAGINATION.MIN_PAGE}`,
    }),
  limit: Joi.number()
    .integer()
    .min(QUERY_VALIDATION.PAGINATION.MIN_LIMIT)
    .max(QUERY_VALIDATION.PAGINATION.MAX_LIMIT)
    .optional()
    .messages({
      "number.base": "limit must be a number",
      "number.integer": "limit must be an integer",
      "number.min": `limit must be at least ${QUERY_VALIDATION.PAGINATION.MIN_LIMIT}`,
      "number.max": `limit must be at most ${QUERY_VALIDATION.PAGINATION.MAX_LIMIT}`,
    }),
  paginateRootChildren: Joi.boolean()
    .optional()
    .messages({
      "boolean.base": "paginateRootChildren must be a boolean",
    }),
})

