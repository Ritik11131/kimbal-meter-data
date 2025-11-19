import { Op } from "sequelize"
import type { WhereOptions } from "sequelize"

/**
 * Builds Sequelize search conditions for multiple fields
 * Creates an OR condition that searches across all specified fields using ILIKE (case-insensitive)
 * 
 * @param searchTerm - The search term to look for
 * @param fields - Array of field names to search in
 * @returns Sequelize where condition with OR logic, or empty object if no search term
 * 
 * @example
 * // Search in name and email fields
 * const where = buildSearchCondition("john", ["name", "email"])
 * // Returns: { [Op.or]: [{ name: { [Op.iLike]: "%john%" } }, { email: { [Op.iLike]: "%john%" } }] }
 */
export const buildSearchCondition = (
  searchTerm: string | undefined,
  fields: string[]
): WhereOptions => {
  if (!searchTerm || !searchTerm.trim() || fields.length === 0) {
    return {}
  }

  const trimmedSearch = searchTerm.trim()
  const searchPattern = `%${trimmedSearch}%`

  return {
    [Op.or]: fields.map((field) => ({
      [field]: {
        [Op.iLike]: searchPattern,
      },
    })),
  }
}

/**
 * Checks if a search condition object has any conditions
 * Since Sequelize uses Symbols for operators, Object.keys() won't work
 * @param condition - The where condition object
 * @returns true if condition has search criteria, false otherwise
 */
export const hasSearchCondition = (condition: WhereOptions): boolean => {
  if (!condition || typeof condition !== 'object') {
    return false
  }
  // Check if it has Op.or (which is a Symbol)
  return Op.or in condition || Object.keys(condition).length > 0
}

