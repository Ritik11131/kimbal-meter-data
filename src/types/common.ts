export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: number
  path?: string
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Pagination metadata for API responses
 * Provides comprehensive pagination information for frontend consumption
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Enhanced paginated API response structure
 * Groups pagination metadata for better organization and readability
 */
export interface PaginatedApiResponse<T> {
  success: boolean
  message: string
  data: T[]
  pagination: PaginationMeta
  timestamp: number
  path?: string
}

export interface BaseEntity {
  id: string
  created_by: string | null
  creation_time: Date
  last_update_on: Date
}

export interface AuthContext {
  userId: string
  entityId: string
  roleId: string
  email: string
  permissions: PermissionSet[]
}

export interface PermissionSet {
  moduleId: string
  name: string
  read: boolean
  write: boolean
}

/**
 * Options for extracting query parameters
 */
export interface QueryExtractionOptions {
  /** Default page value if not provided (default: 1) */
  defaultPage?: number
  /** Default limit value if not provided (default: 10) */
  defaultLimit?: number
  /** Whether to include entityId in extraction (default: false) */
  includeEntityId?: boolean
  /** Additional custom fields to extract */
  customFields?: string[]
}

/**
 * Result of query parameter extraction
 */
export interface ExtractedQueryParams {
  page?: number
  limit?: number
  entityId?: string | null
  [key: string]: any // For custom fields
}

/**
 * Express Request extension for authentication
 * This module augmentation adds user and token properties to Express Request
 */
declare module 'express' {
  interface Request {
    user?: AuthContext
    token?: string
  }
}
