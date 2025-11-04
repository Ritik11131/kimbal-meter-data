import Joi from "joi"

export const createEntitySchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  email_id: Joi.string().email().required(),
  mobile_no: Joi.string()
    .regex(/^\d{10}$/)
    .required(),
  profile_id: Joi.string().uuid().required(),
  entity_id: Joi.string().uuid().optional(),
  attributes: Joi.object().optional(),
})

export const updateEntitySchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  email_id: Joi.string().email().optional(),
  mobile_no: Joi.string()
    .regex(/^\d{10}$/)
    .optional(),
  attributes: Joi.object().optional(),
})
