import { createUserRepository } from "../repositories/user.repository"
import { createRoleRepository } from "../repositories/role.repository"
import type { User, CreateUserDTO, UpdateUserDTO, UserWithoutPassword } from "../types/users"
import { CryptoUtil } from "../utils/cryptography"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import type { AuthContext } from "../types/common"
import { validateEntityAccess, getAccessibleEntityIds } from "../utils/hierarchy"
import { withTransaction } from "../utils/transactions"


export const createUserService = () => {
  const userRepository = createUserRepository()
  const roleRepository = createRoleRepository()

  const excludePassword = (user: User): UserWithoutPassword => {
    const { password_hash, salt, ...userWithoutPassword } = user
    return userWithoutPassword as UserWithoutPassword
  }

  const getUserById = async (id: string, currentUser: AuthContext): Promise<UserWithoutPassword> => {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    // Validate current user has access to the target user's entity
    await validateEntityAccess(currentUser.entityId, user.entity_id, "user")
    return excludePassword(user)
  }

  const createUser = async (data: CreateUserDTO, user: AuthContext): Promise<UserWithoutPassword> => {
    try {
      // Use transaction to ensure atomicity of user creation
      return await withTransaction(async (transaction) => {
        // Validate user can access the entity where new user will be created
        await validateEntityAccess(user.entityId, data.entity_id, "users")

        // Check if user exists by email
        const existingEmail = await userRepository.findByEmail(data.email)
        if (existingEmail) {
          throw new AppError(ERROR_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT)
        }

        const existingMobile = await userRepository.findByMobileNo(data.mobile_no)
        if (existingMobile) {
          throw new AppError("Mobile number already registered", HTTP_STATUS.CONFLICT)
        }

        // Verify role exists
        const role = await roleRepository.findById(data.role_id)
        if (!role) {
          throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND)
        }

        // Hash password
        const salt = CryptoUtil.generateSalt()
        const passwordHash = CryptoUtil.hashPassword(data.password, salt)

        const newUser = await userRepository.create(data, passwordHash, salt, user.userId)
        return excludePassword(newUser)
      })
    } catch (error) {
      logger.error("Error creating user:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const updateUser = async (id: string, data: UpdateUserDTO, user: AuthContext): Promise<UserWithoutPassword> => {
    try {
      await getUserById(id, user)
      const updated = await userRepository.update(id, data)
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }
      return excludePassword(updated)
    } catch (error) {
      logger.error("Error updating user:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const deleteUser = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getUserById(id, user)
      await userRepository.softDelete(id)
    } catch (error) {
      logger.error("Error deleting user:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const listUsers = async (
    entityId: string | null | undefined,
    currentUser: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: UserWithoutPassword[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      // If entityId is provided, list users for that entity
      // Note: Access validation is handled by enforceEntityAccessQuery middleware
      if (entityId) {
        const { data, total } = await userRepository.paginateByEntityId(entityId, page, limit)
        return {
          data: data.map((u) => excludePassword(u)),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
      
      // If no entityId, list all users from accessible entities
      const accessibleEntityIds = await getAccessibleEntityIds(currentUser.entityId)
      const { data, total } = await userRepository.paginateByAccessibleEntities(accessibleEntityIds, page, limit)
      return {
        data: data.map((u) => excludePassword(u)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    } catch (error) {
      logger.error("Error listing users:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  // Keep old method for backward compatibility (if needed)
  const listUsersByEntity = async (
    entityId: string,
    currentUser: AuthContext,
    page = 1,
    limit = 10
  ): Promise<{ data: UserWithoutPassword[]; total: number; page: number; limit: number; totalPages: number }> => {
    return listUsers(entityId, currentUser, page, limit)
  }

  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const user = await userRepository.findById(userId)
      if (!user) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      const isValid = CryptoUtil.comparePassword(currentPassword, user.password_hash, user.salt)
      if (!isValid) {
        throw new AppError("Current password is incorrect", HTTP_STATUS.UNAUTHORIZED)
      }

      const newSalt = CryptoUtil.generateSalt()
      const newHash = CryptoUtil.hashPassword(newPassword, newSalt)

      await userRepository.changePassword(userId, newHash, newSalt)
    } catch (error) {
      logger.error("Error changing password:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    listUsers,
    listUsersByEntity,
    changePassword,
  }
}
