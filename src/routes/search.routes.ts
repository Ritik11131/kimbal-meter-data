import { Router } from "express"
import * as searchController from "../controllers/search.controller"
import { authenticate } from "../middleware/authentication"
import { requireReadPermission } from "../middleware/authorization"
import { validateQuery } from "../validators/query.validator"
import { globalSearchQuerySchema, hierarchyQuerySchema } from "../validators/search.validator"
import { validateUUIDParams } from "../utils/uuidValidation"
import { MODULES } from "../config/constants"

const router = Router()

// Global search endpoint
// Requires read permission for at least one of the searchable modules
router.get(
  "/",
  authenticate,
  requireReadPermission([MODULES.ENTITY, MODULES.USER, MODULES.PROFILE, MODULES.ROLE, MODULES.METER]),
  validateQuery(globalSearchQuerySchema),
  (req, res, next) => searchController.globalSearch(req, res).catch(next)
)

// Get hierarchy for any resource type
// Requires read permission for the specific resource type
router.get(
  "/:type/:id/hierarchy",
  authenticate,
  (req, res, next) => {
    // Dynamically require permission based on resource type
    const { type } = req.params
    let module: string

    switch (type) {
      case "entity":
        module = MODULES.ENTITY
        break
      case "user":
        module = MODULES.USER
        break
      case "profile":
        module = MODULES.PROFILE
        break
      case "role":
        module = MODULES.ROLE
        break
      case "meter":
        module = MODULES.METER
        break
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid resource type",
          timestamp: Date.now(),
          path: req.path,
        })
    }

    requireReadPermission([module])(req, res, (err?: any) => {
      if (err) return next(err)
      next()
    })
  },
  validateUUIDParams(["id"]),
  validateQuery(hierarchyQuerySchema),
  (req, res, next) => searchController.getHierarchy(req, res).catch(next)
)

export default router

