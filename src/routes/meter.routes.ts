import { Router } from "express"
import * as meterController from "../controllers/meter.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createMeterSchema, updateMeterSchema } from "../validators/meter.validator"
import { validateQuery, meterListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, requireReadPermission([MODULES.METER]), validateQuery(meterListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => meterController.list(req, res).catch(next))
router.get("/:id", authenticate, requireReadPermission([MODULES.METER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), (req, res, next) => meterController.getById(req, res).catch(next))

router.post("/", authenticate, requireWritePermission([MODULES.METER]), enforceEntityAccessQuery("entityId"), validate(createMeterSchema), (req, res, next) => {
  meterController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.METER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), validate(updateMeterSchema), (req, res, next) => {
  meterController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.METER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("meter"), (req, res, next) => {
  meterController.remove(req, res).catch(next)
})

export default router
