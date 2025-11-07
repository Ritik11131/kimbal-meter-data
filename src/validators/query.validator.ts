import Joi from "joi"

/**
 * Schema for pagination query parameters
 */
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
})

/**
 * Schema for entity hierarchy query parameters
 */
export const hierarchyQuerySchema = Joi.object({
  depth: Joi.number().integer().min(1).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  paginateRootChildren: Joi.boolean().optional(),
})

/**
 * Schema for entity list query parameters
 */
export const entityListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  profileId: Joi.string().uuid().optional(),
  entityId: Joi.string().uuid().allow(null, "").optional(),
})

/**
 * Schema for profile list query parameters
 */
export const profileListQuerySchema = Joi.object({
  entityId: Joi.string().uuid().allow(null, "").optional(),
})

/**
 * Schema for role list query parameters
 */
export const roleListQuerySchema = Joi.object({
  entityId: Joi.string().uuid().allow(null, "").optional(),
})

/**
 * Validate query parameters using Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    })

    if (error) {
      const messages = error.details.map((d) => d.message).join(", ")
      return res.status(400).json({
        success: false,
        error: messages,
        timestamp: Date.now(),
        path: req.path,
      })
    }

    req.query = value
    next()
  }
}

