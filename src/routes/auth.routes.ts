import { Router } from "express"
import * as authController from "../controllers/auth.controller"
import { validate } from "../utils/validation"
import { loginSchema, registerSchema } from "../validators/auth.validator"
import { authenticate } from "../middleware/authentication"

const router = Router()

router.post("/login", validate(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next)
})

router.post("/register", validate(registerSchema), (req, res, next) => {
  authController.register(req, res).catch(next)
})

router.post("/verify", authenticate, (req, res, next) => {
  authController.verifyToken(req, res).catch(next)
})

export default router
