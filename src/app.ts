import express, { type Application, type Request, type Response } from "express"
import "express-async-errors"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { initializeSequelize, getSequelize } from "./database/connection"
import { validateEnv, envConfig } from "./config/environment"
import { errorHandler } from "./middleware/errorHandler"
import { sendResponse } from "./utils/response"
import { HTTP_STATUS } from "./config/constants"
import logger from "./utils/logger"
import { initializeModels } from "./models"
import apiRoutes from "./routes"

const app: Application = express()

validateEnv()

app.set("trust proxy", 1)

app.use(helmet())
app.use(cors({ origin: envConfig.CORS_ORIGIN }))

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

app.use(morgan("combined", { stream: { write: (message) => logger.info(message) } }))

app.get("/health", (req: Request, res: Response) => {
  sendResponse(res, HTTP_STATUS.OK, { status: "healthy" }, "Server is running", req.path)
})

app.use("/api", apiRoutes)

app.use((req: Request, res: Response) => {
  sendResponse(res, HTTP_STATUS.NOT_FOUND, null, "Endpoint not found", req.path)
})

app.use(errorHandler)


const startServer = async () => {
  try {
    await initializeSequelize()
    logger.info("✅ Sequelize connection established")

    const sequelize = getSequelize()
    initializeModels(sequelize)
    logger.info("✅ Models initialized successfully")

    app.listen(envConfig.PORT, () => {
      logger.info(`🚀 Server running on port ${envConfig.PORT} in ${envConfig.NODE_ENV} mode`)
    })
  } catch (error) {
    logger.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

startServer()

export default app
