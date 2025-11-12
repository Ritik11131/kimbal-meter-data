import { Router } from "express"
import * as profileController from "../controllers/profile.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createProfileSchema, updateProfileSchema } from "../validators/profile.validator"
import { validateQuery, profileListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, requireReadPermission([MODULES.PROFILE]), validateQuery(profileListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => {
  profileController.list(req, res).catch(next)
})

router.get("/:id", authenticate, requireReadPermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), (req, res, next) => {
  profileController.getById(req, res).catch(next)
})

router.post("/", authenticate, requireWritePermission([MODULES.PROFILE]), enforceEntityAccessQuery("entity_id"), validate(createProfileSchema), (req, res, next) => {
  profileController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), validate(updateProfileSchema), (req, res, next) => {
  profileController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), (req, res, next) => {
  profileController.remove(req, res).catch(next)
})

export default router

