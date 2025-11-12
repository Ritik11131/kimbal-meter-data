import type {
  Model,
  ModelCtor,
  FindOptions,
  CreateOptions,
  UpdateOptions,
  DestroyOptions,
  CountOptions,
  WhereOptions,
  Attributes,
} from "sequelize"
import logger from "../utils/logger"

/**
 * Creates a base repository with common CRUD operations
 * @param model - Sequelize model class
 * @returns Repository object with CRUD methods
 */
export const createBaseRepository = <T extends Model>(model: ModelCtor<T>) => ({
  /**
   * Finds all records matching the options
   * @param options - Sequelize find options
   * @returns Array of model instances
   */
  async findAll(options: FindOptions<Attributes<T>> = {}): Promise<T[]> {
    try {
      return await model.findAll(options)
    } catch (error) {
      logger.error(`Find all failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Finds a record by ID
   * @param id - Record ID
   * @param options - Sequelize find options
   * @returns Model instance or null
   */
  async findById(id: string | number, options: FindOptions<Attributes<T>> = {}): Promise<T | null> {
    try {
      return await model.findByPk(id, options)
    } catch (error) {
      logger.error(`Find by ID failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Finds a single record matching the where condition
   * @param where - Where conditions
   * @param options - Sequelize find options
   * @returns Model instance or null
   */
  async findOne(where: WhereOptions<Attributes<T>>, options: FindOptions<Attributes<T>> = {}): Promise<T | null> {
    try {
      return await model.findOne({ where, ...options })
    } catch (error) {
      logger.error(`Find one failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Creates a new record
   * @param data - Record data
   * @param options - Sequelize create options
   * @returns Created model instance
   */
  async create(data: Partial<T["_creationAttributes"]>, options?: CreateOptions<Attributes<T>>): Promise<T> {
    try {
      return await model.create(data as T["_creationAttributes"], options)
    } catch (error) {
      logger.error(`Create failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Updates a record by ID
   * @param id - Record ID
   * @param data - Update data
   * @param options - Sequelize update options
   * @returns Updated model instance or null
   */
  async update(
    id: string | number,
    data: Partial<T["_creationAttributes"]>,
    options?: UpdateOptions<Attributes<T>>
  ): Promise<T | null> {
    try {
      const record = await model.findByPk(id)
      if (!record) return null
      await record.update(data, options)
      return record
    } catch (error) {
      logger.error(`Update failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Deletes a record by ID
   * @param id - Record ID
   * @param options - Sequelize destroy options
   * @returns Number of deleted records
   */
  async delete(id: string | number, options?: DestroyOptions<Attributes<T>>): Promise<number> {
    try {
      const whereCondition = { id } as any
      return await model.destroy({ where: whereCondition, ...options })
    } catch (error) {
      logger.error(`Delete failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Paginates records with optional where conditions
   * @param page - Page number
   * @param limit - Items per page
   * @param where - Where conditions
   * @param options - Sequelize find options
   * @returns Paginated data with total count
   */
  async paginate(
    page = 1,
    limit = 10,
    where: WhereOptions<Attributes<T>> = {},
    options: FindOptions<Attributes<T>> = {}
  ): Promise<{ data: T[]; total: number }> {
    try {
      const offset = (page - 1) * limit
      const { count, rows } = await model.findAndCountAll({
        where,
        offset,
        limit,
        order: [["creation_time", "DESC"]],
        ...options,
      })
      return { data: rows, total: count }
    } catch (error) {
      logger.error(`Paginate failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Creates multiple records in bulk
   * @param data - Array of record data
   * @param options - Sequelize create options
   * @returns Array of created model instances
   */
  async bulkCreate(
    data: Partial<T["_creationAttributes"]>[],
    options?: CreateOptions<Attributes<T>>
  ): Promise<T[]> {
    try {
      return await model.bulkCreate(data as T["_creationAttributes"][], options)
    } catch (error) {
      logger.error(`Bulk create failed on ${model.name}:`, error)
      throw error
    }
  },

  /**
   * Counts records matching the options
   * @param options - Sequelize count options
   * @returns Count of matching records
   */
  async count(options: CountOptions<Attributes<T>> = {}): Promise<number> {
    try {
      return await model.count(options)
    } catch (error) {
      logger.error(`Count failed on ${model.name}:`, error)
      throw error
    }
  },
})
