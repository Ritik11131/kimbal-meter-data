import { Sequelize } from "sequelize"
import { envConfig } from "../config/environment"
import logger from "../utils/logger"

let sequelizeInstance: Sequelize | null = null

export const initializeSequelize = async (): Promise<Sequelize> => {
  if (sequelizeInstance) return sequelizeInstance

  // Optimize connection pool for Railway/serverless environments
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined
  const isProduction = process.env.NODE_ENV === "production"

  sequelizeInstance = new Sequelize(envConfig.DB_NAME, envConfig.DB_USER, envConfig.DB_PASSWORD, {
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? (msg) => logger.debug(msg) : false,
    dialectOptions: {
      connectTimeout: 10000,
      // Add keep-alive for SSH tunnel connections
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
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

  try {
    await sequelizeInstance.authenticate()
    logger.info("PostgreSQL connection authenticated successfully")
  } catch (error) {
    logger.error("Unable to connect to PostgreSQL:", error)
    throw error
  }

  return sequelizeInstance
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
  }
}

export default sequelizeInstance
