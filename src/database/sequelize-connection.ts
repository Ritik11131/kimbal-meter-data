import { Sequelize } from "sequelize"
import dotenv from "dotenv"
import Logger from "../utils/logger"

dotenv.config()

const sequelize = new Sequelize(
  process.env.DB_NAME || "meter_data",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "_D=Y(A9IrAYUSz]}2%lxmiB;yA}M}Zyw",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432"),
    dialect: "postgres",
    logging: (msg) => Logger.debug(msg),
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
)

export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate()
    Logger.info("PostgreSQL connection established successfully")
  } catch (error) {
    Logger.error("Unable to connect to PostgreSQL:", error)
    throw error
  }
}

export default sequelize
