import Joi from "joi"

export const createProfileSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  entity_id: Joi.string().uuid().allow(null).optional(),
  attributes: Joi.object().optional(),
})

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  attributes: Joi.object().optional(),
})

