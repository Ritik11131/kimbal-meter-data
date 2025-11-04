import Joi from "joi"

export const createModuleSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
})

export const updateModuleSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
})

