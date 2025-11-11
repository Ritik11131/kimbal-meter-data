import { Router } from "express"
import * as moduleController from "../controllers/module.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { validate } from "../utils/validation"
import { createModuleSchema, updateModuleSchema } from "../validators/module.validator"
import { validateQuery, moduleListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

// List all modules (root admin only - enforced in service)
router.get("/", authenticate, authorizeRead([MODULES.MODULE]), validateQuery(moduleListQuerySchema), (req, res, next) => {
  moduleController.list(req, res).catch(next)
})

// Get module by ID (root admin only - enforced in service)
router.get("/:id", authenticate, authorizeRead([MODULES.MODULE]), validateUUIDParams(["id"]), (req, res, next) => {
  moduleController.getById(req, res).catch(next)
})

// Create module (root admin only - enforced in service)
router.post("/", authenticate, authorize([MODULES.MODULE]), validate(createModuleSchema), (req, res, next) => {
  moduleController.create(req, res).catch(next)
})

// Update module (root admin only - enforced in service)
router.patch("/:id", authenticate, authorize([MODULES.MODULE]), validateUUIDParams(["id"]), validate(updateModuleSchema), (req, res, next) => {
  moduleController.update(req, res).catch(next)
})

// Delete module (root admin only - enforced in service)
router.delete("/:id", authenticate, authorize([MODULES.MODULE]), validateUUIDParams(["id"]), (req, res, next) => {
  moduleController.remove(req, res).catch(next)
})

export default router

