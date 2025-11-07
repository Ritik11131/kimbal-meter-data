import { getSequelize } from "../database/connection"
import { Transaction } from "sequelize"
import logger from "./logger"

/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
export const withTransaction = async <T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<T> => {
  const sequelize = getSequelize()
  const transaction = await sequelize.transaction()

  try {
    const result = await callback(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    logger.error("Transaction rolled back due to error:", error)
    throw error
  }
}

/**
 * Get a new transaction (for manual control)
 */
export const getTransaction = async (): Promise<Transaction> => {
  const sequelize = getSequelize()
  return await sequelize.transaction()
}

