import { Router } from "express"
import * as moduleController from "../controllers/module.controller"
import { authenticate } from "../middleware/authentication"
import { requireWritePermission, requireReadPermission } from "../middleware/authorization"
import { validate } from "../utils/validation"
import { createModuleSchema, updateModuleSchema } from "../validators/module.validator"
import { validateQuery, moduleListQuerySchema } from "../validators/query.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

router.get("/", authenticate, requireReadPermission([MODULES.MODULE]), validateQuery(moduleListQuerySchema), (req, res, next) => {
  moduleController.list(req, res).catch(next)
})

router.get("/:id", authenticate, requireReadPermission([MODULES.MODULE]), validateUUIDParams(["id"]), (req, res, next) => {
  moduleController.getById(req, res).catch(next)
})

router.post("/", authenticate, requireWritePermission([MODULES.MODULE]), validate(createModuleSchema), (req, res, next) => {
  moduleController.create(req, res).catch(next)
})

router.patch("/:id", authenticate, requireWritePermission([MODULES.MODULE]), validateUUIDParams(["id"]), validate(updateModuleSchema), (req, res, next) => {
  moduleController.update(req, res).catch(next)
})

router.delete("/:id", authenticate, requireWritePermission([MODULES.MODULE]), validateUUIDParams(["id"]), (req, res, next) => {
  moduleController.remove(req, res).catch(next)
})

export default router

