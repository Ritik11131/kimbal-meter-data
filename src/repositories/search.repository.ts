import { createEntityRepository } from "./entity.repository"
import { createUserRepository } from "./user.repository"
import { createProfileRepository } from "./profile.repository"
import { createRoleRepository } from "./role.repository"
import { createMeterRepository } from "./meter.repository"
import type { Entity, Meter } from "../types/entities"
import type { UserWithoutPassword } from "../types/users"
import type { Profile, Role } from "../types/entities"
import type { PaginatedResponse } from "../types/common"

export const createSearchRepository = () => {
  const entityRepo = createEntityRepository()
  const userRepo = createUserRepository()
  const profileRepo = createProfileRepository()
  const roleRepo = createRoleRepository()
  const meterRepo = createMeterRepository()

  /**
   * Search entities with pagination and access control
   */
  const searchEntities = async (
    query: string,
    page: number,
    limit: number,
    accessibleEntityIds?: string[]
  ): Promise<PaginatedResponse<Entity>> => {
    const { data, total } = await entityRepo.paginateEntities(
      page,
      limit,
      undefined, // profileId
      accessibleEntityIds,
      undefined, // parentEntityId
      query // search
    )

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Search users with pagination and access control
   */
  const searchUsers = async (
    query: string,
    page: number,
    limit: number,
    accessibleEntityIds?: string[]
  ): Promise<PaginatedResponse<UserWithoutPassword>> => {
    const { data, total } = await userRepo.paginateByAccessibleEntities(
      accessibleEntityIds, // Can be undefined for root admin
      page,
      limit,
      query
    )

    // Remove password fields
    const usersWithoutPassword: UserWithoutPassword[] = data.map(({ password_hash, salt, ...user }) => user)

    return {
      data: usersWithoutPassword,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Search profiles with pagination and access control
   */
  const searchProfiles = async (
    query: string,
    page: number,
    limit: number,
    accessibleEntityIds?: string[]
  ): Promise<PaginatedResponse<Profile>> => {
    const { data, total } = await profileRepo.paginateProfiles(
      page,
      limit,
      undefined, // entityId
      accessibleEntityIds,
      query // search
    )

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Search roles with pagination and access control
   */
  const searchRoles = async (
    query: string,
    page: number,
    limit: number,
    accessibleEntityIds?: string[]
  ): Promise<PaginatedResponse<Role>> => {
    const { data, total } = await roleRepo.paginateRoles(
      page,
      limit,
      undefined, // entityId
      accessibleEntityIds,
      query // search
    )

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Search meters with pagination and access control
   */
  const searchMeters = async (
    query: string,
    page: number,
    limit: number,
    accessibleEntityIds?: string[]
  ): Promise<PaginatedResponse<Meter>> => {
    const { data, total } = await meterRepo.paginateMeters(
      page,
      limit,
      undefined, // entityId
      accessibleEntityIds, // Can be undefined for root admin
      query // search
    )

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  return {
    searchEntities,
    searchUsers,
    searchProfiles,
    searchRoles,
    searchMeters,
  }
}

