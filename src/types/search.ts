import type { Entity, Profile, Role, Meter } from "./entities"
import type { UserWithoutPassword } from "./users"
import type { PaginatedResponse } from "./common"

/**
 * Resource types that can be searched
 */
export type SearchResourceType = "entity" | "user" | "profile" | "role" | "meter"

/**
 * Global search result grouped by resource type
 */
export interface GlobalSearchResult {
  entities: PaginatedResponse<Entity>
  users: PaginatedResponse<UserWithoutPassword>
  profiles: PaginatedResponse<Profile>
  roles: PaginatedResponse<Role>
  meters: PaginatedResponse<Meter>
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
 * Entity tree with selection marker
 */
export interface EntityTreeWithSelection extends Entity {
  children: EntityTreeWithSelection[]
  isSelected?: boolean
}

/**
 * User hierarchy tree structure with selection marker
 */
export interface UserTree extends UserWithoutPassword {
  children: UserTree[]
  isSelected?: boolean
  entity?: {
    id: string
    name: string
  }
}

/**
 * Hierarchy response structure for entities
 */
export interface EntityHierarchyResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "entity"
    id: string
    name: string
  }
  hierarchy: EntityTreeWithSelection
}

/**
 * Hierarchy response structure for users
 */
export interface UserHierarchyResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "user"
    id: string
    name: string
    entityId: string
  }
  entityHierarchy: EntityTreeWithSelection
  userHierarchy: UserTree
}

/**
 * Profile hierarchy structure (includes entity hierarchy)
 */
export interface ProfileHierarchyResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "profile"
    id: string
    name: string
    entityId: string | null
  }
  profile: Profile
  entityHierarchy?: EntityTreeWithSelection
}

/**
 * Role hierarchy structure (includes entity hierarchy)
 */
export interface RoleHierarchyResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "role"
    id: string
    name: string
    entityId: string | null
  }
  role: Role
  entityHierarchy?: EntityTreeWithSelection
}

/**
 * Path item in hierarchy path
 */
export interface PathItem {
  id: string
  name: string
  type: "entity" | "user" | "profile" | "role" | "meter"
  isSelected: boolean
  email_id?: string
  email?: string
  entityId?: string
}

/**
 * Entity path response (path-only, no siblings)
 */
export interface EntityPathResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "entity"
    id: string
    name: string
  }
  path: PathItem[]
}

/**
 * User path response (path-only)
 */
export interface UserPathResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "user"
    id: string
    name: string
    entityId: string
  }
  entityPath: PathItem[]
  userPath: PathItem[]
}

/**
 * Profile path response (path-only)
 */
export interface ProfilePathResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "profile"
    id: string
    name: string
    entityId: string | null
  }
  profile: Profile
  path: PathItem[]
}

/**
 * Role path response (path-only)
 */
export interface RolePathResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "role"
    id: string
    name: string
    entityId: string | null
  }
  role: Role
  path: PathItem[]
}

/**
 * Meter path response (path-only)
 */
export interface MeterPathResponse {
  userEntity: {
    id: string
    name: string
    email_id?: string
  }
  selectedResource: {
    type: "meter"
    id: string
    name: string
    entityId: string
  }
  meter: Meter
  path: PathItem[]
}

