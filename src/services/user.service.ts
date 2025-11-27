import { createUserRepository } from "../repositories/user.repository"
import { createRoleRepository } from "../repositories/role.repository"
import { createEntityRepository } from "../repositories/entity.repository"
import type { User, CreateUserDTO, UpdateUserDTO, UserWithoutPassword } from "../types/users"
import type { UserTree, UserHierarchyResponse, UserPathResponse, PathItem } from "../types/search"
import { createEntityService } from "./entity.service"
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
  const entityRepository = createEntityRepository()
  const entityService = createEntityService()

  /**
   * Removes password fields from user object
   * @param user - User object with password
   * @returns User object without password fields
   */
  const excludePassword = (user: User): UserWithoutPassword => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, salt, ...userWithoutPassword } = user
    return userWithoutPassword as UserWithoutPassword
  }

  /**
   * Retrieves a user by ID and validates access
   * @param id - User ID
   * @param currentUser - Authenticated user context
   * @returns User without password fields
   */
  const getUserById = async (id: string, currentUser: AuthContext): Promise<UserWithoutPassword> => {
    const user = await userRepository.findById(id)
    if (!user) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    await validateEntityAccess(currentUser.entityId, user.entity_id, "user")
    return excludePassword(user)
  }

  /**
   * Creates a new user
   * @param data - User creation data
   * @param user - Authenticated user context
   * @returns Created user without password fields
   */
  const createUser = async (data: CreateUserDTO, user: AuthContext): Promise<UserWithoutPassword> => {
    try {
      return await withTransaction(async () => {
        await validateEntityAccess(user.entityId, data.entity_id, "users")

        const existingEmail = await userRepository.findByEmail(data.email)
        if (existingEmail) {
          throw new AppError(ERROR_MESSAGES.DUPLICATE_EMAIL, HTTP_STATUS.CONFLICT)
        }

        const existingMobile = await userRepository.findByMobileNo(data.mobile_no)
        if (existingMobile) {
          throw new AppError("Mobile number already registered", HTTP_STATUS.CONFLICT)
        }

        const role = await roleRepository.findById(data.role_id)
        if (!role) {
          throw new AppError("Role not found", HTTP_STATUS.NOT_FOUND)
        }

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

  /**
   * Updates an existing user
   * @param id - User ID
   * @param data - User update data
   * @param user - Authenticated user context
   * @returns Updated user without password fields
   */
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

  /**
   * Deletes a user (soft delete)
   * @param id - User ID
   * @param user - Authenticated user context
   */
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

  /**
   * Lists users with pagination and optional entity filter
   * @param entityId - Optional entity ID filter
   * @param currentUser - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated user list
   */
  const listUsers = async (
    entityId: string | null | undefined,
    currentUser: AuthContext,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: UserWithoutPassword[]; total: number; page: number; limit: number; totalPages: number }> => {
    try {
      if (entityId) {
        const { data, total } = await userRepository.paginateByEntityId(entityId, page, limit, search)
        return {
          data: data.map((u) => excludePassword(u)),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      }
      
      const accessibleEntityIds = await getAccessibleEntityIds(currentUser.entityId)
      const { data, total } = await userRepository.paginateByAccessibleEntities(accessibleEntityIds, page, limit, search)
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

  /**
   * Lists users by entity (backward compatibility)
   * @param entityId - Entity ID
   * @param currentUser - Authenticated user context
   * @param page - Page number
   * @param limit - Items per page
   * @param search - Optional search term
   * @returns Paginated user list
   */
  const listUsersByEntity = async (
    entityId: string,
    currentUser: AuthContext,
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ data: UserWithoutPassword[]; total: number; page: number; limit: number; totalPages: number }> => {
    return listUsers(entityId, currentUser, page, limit, search)
  }

  /**
   * Changes user password
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
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

  /**
   * Builds a nested tree structure from flat array of users
   * @param users - Flat array of users
   * @param rootUserId - ID of the root user
   * @returns User tree structure or null if no users
   */
  const buildUserTree = async (
    users: User[],
    rootUserId: string
  ): Promise<UserTree | null> => {
    if (users.length === 0) return null

    const userMap = new Map<string, UserTree>()
    
    // Create user tree nodes
    users.forEach(user => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, salt, ...userWithoutPassword } = user
      userMap.set(user.id, {
        ...userWithoutPassword,
        children: [],
        entity: undefined,
      } as UserTree)
    })

    const rootUser = userMap.get(rootUserId)
    if (!rootUser) return null

    // Build parent-child relationships
    const childrenByParent = new Map<string, User[]>()
    users.forEach(user => {
      if (user.id !== rootUserId && user.created_by) {
        if (!childrenByParent.has(user.created_by)) {
          childrenByParent.set(user.created_by, [])
        }
        childrenByParent.get(user.created_by)!.push(user)
      }
    })

    // Attach children to parents
    users.forEach(user => {
      if (user.id !== rootUserId && user.created_by) {
        const parent = userMap.get(user.created_by)
        const child = userMap.get(user.id)
        if (parent && child) {
          parent.children.push(child)
        }
      }
    })

    // Fetch entity info for root user
    const rootEntity = users.find(u => u.id === rootUserId)?.entity_id
    if (rootEntity) {
      try {
        const entity = await entityRepository.findById(rootEntity)
        if (entity) {
          rootUser.entity = { id: entity.id, name: entity.name }
        }
      } catch (error) {
        // Ignore errors - entity might not exist
        logger.debug(`Entity ${rootEntity} not found for user ${rootUserId}`)
      }
    }

    // Sort children by creation time
    const sortChildren = (user: UserTree) => {
      user.children.sort((a, b) => 
        new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
      )
      user.children.forEach(child => sortChildren(child))
    }
    sortChildren(rootUser)

    return rootUser
  }

  /**
   * Marks a selected user in the hierarchy tree
   * @param tree - User tree
   * @param selectedUserId - ID of the selected user
   * @returns Tree with isSelected markers
   */
  const markSelectedUser = (tree: UserTree, selectedUserId: string): UserTree => {
    const markRecursive = (node: UserTree): UserTree => {
      const isSelected = node.id === selectedUserId
      return {
        ...node,
        isSelected,
        children: node.children.map(child => markRecursive(child)),
      }
    }
    return markRecursive(tree)
  }

  /**
   * Gets exact path from logged-in user's entity to selected user (path-only, no siblings)
   * @param selectedUserId - The user to find in hierarchy
   * @param user - Authenticated user context
   * @returns User path response with exact paths
   */
  const getUserPathFromUserEntity = async (
    selectedUserId: string,
    user: AuthContext
  ): Promise<UserPathResponse> => {
    try {
      const targetUser = await userRepository.findById(selectedUserId)
      if (!targetUser) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Validate access - user must be in accessible entity
      await validateEntityAccess(user.entityId, targetUser.entity_id, "user")

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      // Get entity path from user's entity to target user's entity
      const entityPath = await entityService.getEntityPathFromUserEntity(targetUser.entity_id, user)
      
      // Get user path: find the actual root user by following created_by chain backwards
      // Start from target user and go up until we find a user with no created_by (the root)
      let rootUserId: string | null = selectedUserId
      const visited = new Set<string>()
      
      while (rootUserId && !visited.has(rootUserId)) {
        visited.add(rootUserId)
        const currentUser = await userRepository.findById(rootUserId)
        if (!currentUser) break
        
        // If this user has no creator, or creator is not in the same entity, this is the root
        if (!currentUser.created_by) {
          break
        }
        
        // Check if creator is in the same entity
        const creator = await userRepository.findById(currentUser.created_by)
        if (!creator || creator.entity_id !== targetUser.entity_id) {
          // Creator is in different entity or doesn't exist, current user is root
          break
        }
        
        rootUserId = currentUser.created_by
      }
      
      if (!rootUserId) {
        throw new AppError("Could not determine root user for user path", HTTP_STATUS.NOT_FOUND)
      }

      // Get user path from root user to target user
      const userPathData = await userRepository.findUserPath(rootUserId, selectedUserId)
      
      // Convert to PathItem format
      const entityPathItems: PathItem[] = entityPath.path
      
      const userPathItems: PathItem[] = userPathData.map((u) => ({
        id: u.id,
        name: u.name,
        type: "user" as const,
        isSelected: u.id === selectedUserId,
        email: u.email,
        entityId: u.entity_id,
      }))

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "user",
          id: targetUser.id,
          name: targetUser.name,
          entityId: targetUser.entity_id,
        },
        entityPath: entityPathItems,
        userPath: userPathItems,
      }
    } catch (error) {
      logger.error("Error fetching user path from user entity:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Retrieves user hierarchy starting from logged-in user's entity
   * @deprecated Use getUserPathFromUserEntity for path-only results
   * @param selectedUserId - The user to find in hierarchy
   * @param user - Authenticated user context
   * @param options - Optional depth
   * @returns User hierarchy response with entity and user hierarchies
   */
  const getUserHierarchyFromUserEntity = async (
    selectedUserId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<UserHierarchyResponse> => {
    try {
      const targetUser = await userRepository.findById(selectedUserId)
      if (!targetUser) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Validate access - user must be in accessible entity
      await validateEntityAccess(user.entityId, targetUser.entity_id, "user")

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId)
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND)
      }

      // Get entity hierarchy from user's entity to target user's entity
      const entityHierarchy = await entityService.getEntityHierarchy(user.entityId, user, options)
      const entityTreeWithSelection = entityService.markSelectedEntity(entityHierarchy, targetUser.entity_id)

      // Get user hierarchy starting from root user in target user's entity
      // Find the root user (created_by is null) in that entity
      const usersInEntity = await userRepository.findByEntityId(targetUser.entity_id)
      const rootUser = usersInEntity.find(u => !u.created_by) || usersInEntity[0]
      
      if (!rootUser) {
        throw new AppError("No users found in entity", HTTP_STATUS.NOT_FOUND)
      }

      const users = await userRepository.findUserHierarchy(rootUser.id, options?.depth)
      const userTree = await buildUserTree(users, rootUser.id)
      
      if (!userTree) {
        throw new AppError("User hierarchy not found", HTTP_STATUS.NOT_FOUND)
      }

      // Mark selected user
      const userTreeWithSelection = markSelectedUser(userTree, selectedUserId)

      // Fetch entity info for users
      const entity = await entityRepository.findById(targetUser.entity_id)
      if (entity) {
        userTreeWithSelection.entity = { id: entity.id, name: entity.name }
        // Also set entity for all children
        const setEntityRecursive = (node: UserTree) => {
          if (!node.entity && entity) {
            node.entity = { id: entity.id, name: entity.name }
          }
          node.children.forEach(child => setEntityRecursive(child))
        }
        setEntityRecursive(userTreeWithSelection)
      }

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "user",
          id: targetUser.id,
          name: targetUser.name,
          entityId: targetUser.entity_id,
        },
        entityHierarchy: entityTreeWithSelection,
        userHierarchy: userTreeWithSelection,
      }
    } catch (error) {
      logger.error("Error fetching user hierarchy from user entity:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Retrieves user hierarchy tree (legacy method - kept for backward compatibility)
   * @param userId - Root user ID
   * @param user - Authenticated user context
   * @param options - Optional depth
   * @returns User tree with hierarchy
   */
  const getUserHierarchy = async (
    userId: string,
    user: AuthContext,
    options?: { depth?: number }
  ): Promise<UserTree> => {
    try {
      const targetUser = await userRepository.findById(userId)
      if (!targetUser) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      // Validate access - user must be in accessible entity
      await validateEntityAccess(user.entityId, targetUser.entity_id, "user")

      const users = await userRepository.findUserHierarchy(userId, options?.depth)
      const tree = await buildUserTree(users, userId)

      if (!tree) {
        throw new AppError("User hierarchy not found", HTTP_STATUS.NOT_FOUND)
      }

      // Fetch entity info for root user
      const entity = await entityRepository.findById(targetUser.entity_id)
      if (entity) {
        tree.entity = { id: entity.id, name: entity.name }
      }

      return tree
    } catch (error) {
      logger.error("Error fetching user hierarchy:", error)
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
    getUserHierarchy,
    getUserHierarchyFromUserEntity,
    getUserPathFromUserEntity,
  }
}
