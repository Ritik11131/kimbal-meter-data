import { Router } from "express"
import * as roleController from "../controllers/role.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { validate } from "../utils/validation"
import { createRoleSchema, updateRoleSchema } from "../validators/role.validator"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/:id", authenticate, authorizeRead([MODULES.ROLE]), (req, res, next) => roleController.getById(req, res).catch(next))
router.get("/entity/:entityId", authenticate, authorizeRead([MODULES.ROLE]), (req, res, next) => roleController.listByEntity(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.ROLE]), validate(createRoleSchema), (req, res, next) => {
  roleController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.ROLE]), validate(updateRoleSchema), (req, res, next) => {
  roleController.update(req, res).catch(next)
})

export default router
