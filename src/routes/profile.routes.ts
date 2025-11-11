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

// List profiles (supports ?entityId=xxx query param)
router.get("/", authenticate, requireReadPermission([MODULES.PROFILE]), validateQuery(profileListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => {
  profileController.list(req, res).catch(next)
})

// Get profile by ID
router.get("/:id", authenticate, requireReadPermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), (req, res, next) => {
  profileController.getById(req, res).catch(next)
})

// Create profile (validates entity_id access if provided)
router.post("/", authenticate, requireWritePermission([MODULES.PROFILE]), enforceEntityAccessQuery("entity_id"), validate(createProfileSchema), (req, res, next) => {
  profileController.create(req, res).catch(next)
})

// Update profile
router.patch("/:id", authenticate, requireWritePermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), validate(updateProfileSchema), (req, res, next) => {
  profileController.update(req, res).catch(next)
})

// Delete profile
router.delete("/:id", authenticate, requireWritePermission([MODULES.PROFILE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("profile"), (req, res, next) => {
  profileController.remove(req, res).catch(next)
})

export default router

