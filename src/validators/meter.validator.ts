import Joi from "joi"

export const createMeterSchema = Joi.object({
  entityId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).required(),
  meterType: Joi.string().valid("PHYSICAL", "VIRTUAL", "GROUP").required(),
  attributes: Joi.object().optional(),
})

export const updateMeterSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  attributes: Joi.object().optional(),
})
