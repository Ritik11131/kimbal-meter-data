import Joi from "joi"

export const createMeterSchema = Joi.object({
  entity_id: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).required(),
  meter_type: Joi.string().valid("PHYSICAL", "VIRTUAL", "GROUP").required(),
  attributes: Joi.object().optional(),
  tb_ref_id: Joi.string().uuid().allow(null).optional(),
  tb_token: Joi.string().allow(null).optional(),
})

export const updateMeterSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  meter_type: Joi.string().valid("PHYSICAL", "VIRTUAL", "GROUP").optional(),
  attributes: Joi.object().optional(),
  tb_ref_id: Joi.string().uuid().allow(null).optional(),
  tb_token: Joi.string().allow(null).optional(),
})
