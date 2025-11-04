import Joi from "joi"

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  entityId: Joi.alternatives().try(Joi.string().uuid(), Joi.valid(null)).optional(),
  permissions: Joi.array()
    .items(
      Joi.object({
        moduleId: Joi.string().uuid().required(),
        name: Joi.string().required(),
        read: Joi.boolean().required(),
        write: Joi.boolean().required(),
      }),
    )
    .required(),
})

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  permissions: Joi.array()
    .items(
      Joi.object({
        moduleId: Joi.string().uuid().required(),
        name: Joi.string().required(),
        read: Joi.boolean().required(),
        write: Joi.boolean().required(),
      }),
    )
    .optional(),
})
