import type { Entity, Profile, Role } from "./entities"
import type { UserWithoutPassword } from "./users"
import type { PaginatedResponse } from "./common"

/**
 * Resource types that can be searched
 */
export type SearchResourceType = "entity" | "user" | "profile" | "role"

/**
 * Global search result grouped by resource type
 */
export interface GlobalSearchResult {
  entities: PaginatedResponse<Entity>
  users: PaginatedResponse<UserWithoutPassword>
  profiles: PaginatedResponse<Profile>
  roles: PaginatedResponse<Role>
}

/**
 * Search options for global search
 */
export interface SearchOptions {
  query: string
  types?: SearchResourceType[]
  page?: number
  limit?: number
  accessibleEntityIds?: string[]
}

/**
 * User hierarchy tree structure
 */
export interface UserTree extends UserWithoutPassword {
  children: UserTree[]
  entity?: {
    id: string
    name: string
  }
}

/**
 * Profile hierarchy structure (includes entity hierarchy)
 */
export interface ProfileHierarchy extends Profile {
  entity?: {
    id: string
    name: string
    children?: any[] // Entity tree structure
  }
}

/**
 * Role hierarchy structure (includes entity hierarchy)
 */
export interface RoleHierarchy extends Role {
  entity?: {
    id: string
    name: string
    children?: any[] // Entity tree structure
  }
}

