import { Router } from "express"
import * as profileController from "../controllers/profile.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccessQuery } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createProfileSchema, updateProfileSchema } from "../validators/profile.validator"
import { MODULES } from "../config/constants"

const router = Router()

// List profiles (supports ?entityId=xxx query param)
router.get("/", authenticate, authorizeRead([MODULES.PROFILE]), (req, res, next) => {
  profileController.list(req, res).catch(next)
})

// Get profile by ID
router.get("/:id", authenticate, authorizeRead([MODULES.PROFILE]), (req, res, next) => {
  profileController.getById(req, res).catch(next)
})

// Create profile (validates entity_id access if provided)
router.post("/", authenticate, authorize([MODULES.PROFILE]), enforceEntityAccessQuery("entity_id"), validate(createProfileSchema), (req, res, next) => {
  profileController.create(req, res).catch(next)
})

// Update profile
router.patch("/:id", authenticate, authorize([MODULES.PROFILE]), validate(updateProfileSchema), (req, res, next) => {
  profileController.update(req, res).catch(next)
})

// Delete profile
router.delete("/:id", authenticate, authorize([MODULES.PROFILE]), (req, res, next) => {
  profileController.remove(req, res).catch(next)
})

export default router

