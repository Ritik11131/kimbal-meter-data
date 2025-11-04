import { Router } from "express"
import * as meterController from "../controllers/meter.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccess, enforceEntityAccessQuery } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createMeterSchema, updateMeterSchema } from "../validators/meter.validator"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/:id", authenticate, authorizeRead([MODULES.ENTITY]), (req, res, next) => meterController.getById(req, res).catch(next))
router.get("/entity/:entityId", authenticate, authorizeRead([MODULES.ENTITY]), enforceEntityAccess("entityId"), (req, res, next) => meterController.listByEntity(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.ENTITY]), enforceEntityAccessQuery("entityId"), validate(createMeterSchema), (req, res, next) => {
  meterController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.ENTITY]), validate(updateMeterSchema), (req, res, next) => {
  meterController.update(req, res).catch(next)
})

export default router
