import Joi from "joi"

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
})

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  mobile_no: Joi.string()
    .regex(/^\d{10}$/)
    .required(),
  name: Joi.string().min(2).max(100).required(),
  password: Joi.string().min(6).required(),
  entity_id: Joi.string().uuid().required(),
  role_id: Joi.string().uuid().required(),
})
