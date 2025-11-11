import { Router } from "express"
import * as roleController from "../controllers/role.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { validate } from "../utils/validation"
import { createRoleSchema, updateRoleSchema } from "../validators/role.validator"
import { validateQuery, roleListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { enforceEntityAccessQuery, enforceResourceEntityAccess } from "../middleware/hierarchy"
import { MODULES } from "../config/constants"

const router = Router()

// List roles - must come before /:id route to avoid conflicts
router.get("/", authenticate, requireReadPermission([MODULES.ROLE]), validateQuery(roleListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => roleController.listByEntity(req, res).catch(next))
// Get role by ID - must come after list route
router.get("/:id", authenticate, requireReadPermission([MODULES.ROLE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("role"), (req, res, next) => roleController.getById(req, res).catch(next))

router.post("/", authenticate, requireWritePermission([MODULES.ROLE]), enforceEntityAccessQuery("entityId"), validate(createRoleSchema), (req, res, next) => {
  roleController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.ROLE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("role"), validate(updateRoleSchema), (req, res, next) => {
  roleController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.ROLE]), validateUUIDParams(["id"]), enforceResourceEntityAccess("role"), (req, res, next) => {
  roleController.remove(req, res).catch(next)
})

export default router
