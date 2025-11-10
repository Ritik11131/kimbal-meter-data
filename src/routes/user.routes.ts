import { Router } from "express"
import * as userController from "../controllers/user.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createUserSchema, updateUserSchema, changePasswordSchema } from "../validators/user.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

// List users (supports ?entityId=xxx query param) - must come before /:id route
router.get("/", authenticate, authorizeRead([MODULES.USER]), enforceEntityAccessQuery("entityId"), (req, res, next) => userController.list(req, res).catch(next))
// Get user by ID - must come after list route
router.get("/:id", authenticate, authorizeRead([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), (req, res, next) => userController.getById(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.USER]), enforceEntityAccessQuery("entity_id"), validate(createUserSchema), (req, res, next) => {
  userController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), validate(updateUserSchema), (req, res, next) => {
  userController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, authorize([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), (req, res, next) => {
  userController.remove(req, res).catch(next)
})

router.post("/change-password", authenticate, validate(changePasswordSchema), (req, res, next) => {
  userController.changePassword(req, res).catch(next)
})

export default router
