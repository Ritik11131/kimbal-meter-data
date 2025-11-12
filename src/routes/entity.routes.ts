import { Router } from "express"
import * as entityController from "../controllers/entity.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { enforceEntityAccess, enforceEntityAccessQuery, validateParentEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createEntitySchema, updateEntitySchema } from "../validators/entity.validator"
import { validateQuery, entityListQuerySchema, hierarchyQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, requireReadPermission([MODULES.ENTITY]), validateQuery(entityListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => entityController.list(req, res).catch(next))
router.get("/:id", authenticate, requireReadPermission([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), (req, res, next) => entityController.getById(req, res).catch(next))
router.get("/:id/hierarchy", authenticate, requireReadPermission([MODULES.ENTITY]), validateUUIDParams(["id"]), validateQuery(hierarchyQuerySchema), enforceEntityAccess(), (req, res, next) => entityController.getHierarchy(req, res).catch(next))

router.post("/", authenticate, requireWritePermission([MODULES.ENTITY]), validateParentEntityAccess(), validate(createEntitySchema), (req, res, next) => {
  entityController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), validate(updateEntitySchema), (req, res, next) => {
  entityController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), (req, res, next) => {
  entityController.remove(req, res).catch(next)
})

export default router
