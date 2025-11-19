import { Router } from "express"
import authRoutes from "./auth.routes"
import entityRoutes from "./entity.routes"
import userRoutes from "./user.routes"
import roleRoutes from "./role.routes"
import meterRoutes from "./meter.routes"
import profileRoutes from "./profile.routes"
import moduleRoutes from "./module.routes"
import searchRoutes from "./search.routes"

const router = Router()

router.use("/auth", authRoutes)
router.use("/entities", entityRoutes)
router.use("/users", userRoutes)
router.use("/roles", roleRoutes)
router.use("/meters", meterRoutes)
router.use("/profiles", profileRoutes)
router.use("/modules", moduleRoutes)
router.use("/search", searchRoutes)

export default router
