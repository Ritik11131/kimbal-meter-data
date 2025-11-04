import { CryptoUtil } from "../utils/cryptography"
import { JwtUtil } from "../utils/jwt"
import type { CreateUserDTO, LoginDTO, AuthResponse, UserWithoutPassword } from "../types/users"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"
import { createUserRepository } from "../repositories/user.repository"
import { createRoleRepository } from "../repositories/role.repository"

export const createAuthService = () => {
  const userRepository = createUserRepository()
  const roleRepository = createRoleRepository()

  const register = async (data: CreateUserDTO): Promise<AuthResponse> => {
    try {
      const existingUser = await userRepository.findByEmail(data.email)
      if (existingUser) {
        throw new AppError(ERROR_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT)
      }

      const salt = CryptoUtil.generateSalt()
      const passwordHash = CryptoUtil.hashPassword(data.password, salt)

      const user = await userRepository.create(data, passwordHash, salt)

      const role = await roleRepository.findById(user.role_id)
      if (!role) throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND)

      const permissions = (role.attributes as any)?.roles || []

      const token = JwtUtil.sign({
        userId: user.id,
        entityId: user.entity_id,
        roleId: user.role_id,
        email: user.email,
        permissions,
      })

      const { password_hash, salt: _, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword as UserWithoutPassword,
        token,
        expiresIn: "24h",
      }
    } catch (error) {
      logger.error("Registration error:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const login = async (data: LoginDTO): Promise<AuthResponse> => {
    try {
      const user = await userRepository.findByEmail(data.email)
      if (!user) {
        throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
      }

      if (!user.is_active) {
        throw new AppError("User account is inactive", HTTP_STATUS.FORBIDDEN)
      }

      const isPasswordValid = CryptoUtil.comparePassword(
        data.password,
        user.password_hash,
        user.salt,
      )
      if (!isPasswordValid) {
        throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
      }

      const role = await roleRepository.findById(user.role_id)
      if (!role) throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND)

      const permissions = (role.attributes as any)?.roles || []

      const token = JwtUtil.sign({
        userId: user.id,
        entityId: user.entity_id,
        roleId: user.role_id,
        email: user.email,
        permissions,
      })

      const { password_hash, salt: _, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword as UserWithoutPassword,
        token,
        expiresIn: "24h",
      }
    } catch (error) {
      logger.error("Login error:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  const verifyToken = (token: string) => {
    try {
      return JwtUtil.verify(token)
    } catch {
      throw new AppError("Invalid or expired token", HTTP_STATUS.UNAUTHORIZED)
    }
  }

  return {
    register,
    login,
    verifyToken,
  }
}
