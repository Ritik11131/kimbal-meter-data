import type Joi from "joi"
import type { Request, Response, NextFunction } from "express"
import { sendError } from "./response"
import { HTTP_STATUS } from "../config/constants"

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const messages = error.details.map((d) => d.message).join(", ")
      return sendError(res, HTTP_STATUS.BAD_REQUEST, messages, req.path)
    }

    req.body = value
    next()
  }
}
