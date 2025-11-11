import { Router } from "express"
import * as entityController from "../controllers/entity.controller"
import { authenticate } from "../middleware/authentication"
import { authorize, authorizeRead } from "../middleware/authorization"
import { enforceEntityAccess, enforceEntityAccessQuery, validateParentEntityAccess } from "../middleware/hierarchy"
import { validate } from "../utils/validation"
import { createEntitySchema, updateEntitySchema } from "../validators/entity.validator"
import { validateQuery, entityListQuerySchema, hierarchyQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, authorizeRead([MODULES.ENTITY]), validateQuery(entityListQuerySchema), enforceEntityAccessQuery("entityId"), (req, res, next) => entityController.list(req, res).catch(next))
router.get("/:id", authenticate, authorizeRead([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), (req, res, next) => entityController.getById(req, res).catch(next))
router.get("/:id/hierarchy", authenticate, authorizeRead([MODULES.ENTITY]), validateUUIDParams(["id"]), validateQuery(hierarchyQuerySchema), enforceEntityAccess(), (req, res, next) => entityController.getHierarchy(req, res).catch(next))

router.post("/", authenticate, authorize([MODULES.ENTITY]), validateParentEntityAccess(), validate(createEntitySchema), (req, res, next) => {
  entityController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, authorize([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), validate(updateEntitySchema), (req, res, next) => {
  entityController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, authorize([MODULES.ENTITY]), validateUUIDParams(["id"]), enforceEntityAccess(), (req, res, next) => {
  entityController.remove(req, res).catch(next)
})

export default router
