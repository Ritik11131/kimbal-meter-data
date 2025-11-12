import { Router } from "express"
import * as userController from "../controllers/user.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createUserSchema, updateUserSchema, changePasswordSchema } from "../validators/user.validator"
import { validateQuery, userListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, requireReadPermission([MODULES.USER]), validateQuery(userListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => userController.list(req, res).catch(next))
router.get("/:id", authenticate, requireReadPermission([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), (req, res, next) => userController.getById(req, res).catch(next))

router.post("/", authenticate, requireWritePermission([MODULES.USER]), enforceEntityAccessQuery("entity_id"), validate(createUserSchema), (req, res, next) => {
  userController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), validate(updateUserSchema), (req, res, next) => {
  userController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.USER]), validateUUIDParams(["id"]), enforceResourceEntityAccess("user"), (req, res, next) => {
  userController.remove(req, res).catch(next)
})

router.post("/change-password", authenticate, validate(changePasswordSchema), (req, res, next) => {
  userController.changePassword(req, res).catch(next)
})

export default router
