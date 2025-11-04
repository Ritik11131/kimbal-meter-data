import { Router } from "express"
import * as userController from "../controllers/user.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccess, enforceEntityAccessQuery } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createUserSchema, updateUserSchema, changePasswordSchema } from "../validators/user.validator"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/:id", authenticate, authorizeRead([MODULES.USER]), (req, res, next) => userController.getById(req, res).catch(next))
router.get("/entity/:entityId", authenticate, authorizeRead([MODULES.USER]), enforceEntityAccess("entityId"), (req, res, next) => userController.listByEntity(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.USER]), enforceEntityAccessQuery("entity_id"), validate(createUserSchema), (req, res, next) => {
  userController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.USER]), validate(updateUserSchema), (req, res, next) => {
  userController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, authorize([MODULES.USER]), (req, res, next) => {
  userController.remove(req, res).catch(next)
})

router.post("/change-password", authenticate, validate(changePasswordSchema), (req, res, next) => {
  userController.changePassword(req, res).catch(next)
})

export default router
