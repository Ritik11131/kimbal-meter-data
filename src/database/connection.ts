import { Sequelize } from "sequelize"
import { envConfig } from "../config/environment"
import logger from "../utils/logger"

let sequelizeInstance: Sequelize | null = null
let dbInitialized = false

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 5000 // 5 seconds

export const initializeSequelize = async (): Promise<Sequelize> => {
  if (dbInitialized && sequelizeInstance) {
    logger.info("Sequelize already initialized, returning existing instance.")
    return sequelizeInstance
  }

  // Optimize connection pool for Railway/serverless environments
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined
  const isProduction = process.env.NODE_ENV === "production"

  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      sequelizeInstance = new Sequelize(envConfig.DB_NAME, envConfig.DB_USER, envConfig.DB_PASSWORD, {
        host: envConfig.DB_HOST,
        port: envConfig.DB_PORT,
        dialect: "postgres",
        logging: process.env.NODE_ENV === "development" ? (msg) => logger.debug(msg) : false,
        dialectOptions: {
          connectTimeout: 60000, // 60 seconds for tunnel connections
          // Add keep-alive for SSH tunnel connections
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
          // SSL configuration for production (Railway may require this)
          ...(isProduction && {
            ssl: {
              require: false,
              rejectUnauthorized: false,
            },
          }),
        },
        pool: isRailway || isProduction ? {
          // Optimized for Railway/production
          max: 10,
          min: 1,
          acquire: 30000,
          idle: 10000,
          evict: 1000, // Check for idle connections every second
        } : {
          // Development settings
          max: 20,
          min: 2,
          acquire: 30000,
          idle: 10000,
        },
      })

      await sequelizeInstance.authenticate()
      logger.info("✅ PostgreSQL connection authenticated successfully")
      dbInitialized = true
      return sequelizeInstance
    } catch (error: any) {
      retries++
      logger.error(`❌ Attempt ${retries}/${MAX_RETRIES} to connect to PostgreSQL failed:`, error.message)
      
      if (
        error.name === "SequelizeConnectionRefusedError" ||
        error.name === "SequelizeHostNotFoundError" ||
        error.name === "SequelizeHostNotReachableError" ||
        error.name === "SequelizeConnectionTimedOutError" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT"
      ) {
        if (retries < MAX_RETRIES) {
          logger.info(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`)
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          // Clean up failed instance
          if (sequelizeInstance) {
            try {
              await sequelizeInstance.close()
            } catch (closeError) {
              // Ignore close errors
            }
            sequelizeInstance = null
          }
          continue
        }
      }
      
      // For other errors or max retries reached, throw
      logger.error("❌ Failed to connect to PostgreSQL after all retries")
      throw error
    }
  }

  throw new Error(`Failed to connect to PostgreSQL after ${MAX_RETRIES} retries`)
}

export const getSequelize = (): Sequelize => {
  if (!sequelizeInstance) {
    throw new Error("Sequelize not initialized. Call initializeSequelize first.")
  }
  return sequelizeInstance
}

export const closeSequelize = async (): Promise<void> => {
  if (sequelizeInstance) {
    await sequelizeInstance.close()
    logger.info("Sequelize connection closed")
    sequelizeInstance = null
    dbInitialized = false
  }
}

export default sequelizeInstance
