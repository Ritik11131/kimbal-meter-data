import Joi from "joi"

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  mobile_no: Joi.string().min(10).max(15).required(),
  name: Joi.string().min(2).max(255).required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      "string.pattern.base": "Password must contain at least one uppercase, lowercase, number, and special character",
    }),
  entity_id: Joi.string().uuid().required(),
  role_id: Joi.string().uuid().required(),
}).required()

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional(),
  mobile_no: Joi.string().min(10).max(15).optional(),
  name: Joi.string().min(2).max(255).optional(),
  is_active: Joi.boolean().optional(),
}).required()

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      "string.pattern.base": "Password must contain at least one uppercase, lowercase, number, and special character",
    }),
}).required()

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).required()
