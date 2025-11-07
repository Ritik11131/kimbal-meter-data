import { Router } from "express"
import * as meterController from "../controllers/meter.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createMeterSchema, updateMeterSchema } from "../validators/meter.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

// List meters (supports ?entityId=xxx query param) - must come before /:id route
router.get("/", authenticate, authorizeRead([MODULES.ENTITY]), (req, res, next) => meterController.list(req, res).catch(next))
// Get meter by ID - must come after list route
router.get("/:id", authenticate, authorizeRead([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), (req, res, next) => meterController.getById(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.ENTITY]), enforceEntityAccessQuery("entityId"), validate(createMeterSchema), (req, res, next) => {
  meterController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), validate(updateMeterSchema), (req, res, next) => {
  meterController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, authorize([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), (req, res, next) => {
  meterController.remove(req, res).catch(next)
})

export default router
