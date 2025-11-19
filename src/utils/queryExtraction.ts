import type { Request } from "express"
import type { QueryExtractionOptions, ExtractedQueryParams } from "../types/common"

/**
 * Extract and type-safe query parameters from Express request
 * 
 * This utility handles the common pattern of extracting pagination and filter
 * parameters from validated query strings. Since query parameters come as strings
 * from the URL but are validated and converted by Joi, we need proper type checking.
 * 
 * @param req - Express request object
 * @param options - Extraction options
 * @returns Extracted and typed query parameters
 * 
 * @example
 * // Basic pagination
 * const { page, limit } = extractQueryParams(req)
 * 
 * @example
 * // With entityId
 * const { page, limit, entityId } = extractQueryParams(req, { includeEntityId: true })
 * 
 * @example
 * // With custom fields
 * const { page, limit, profileId } = extractQueryParams(req, {
 *   customFields: ['profileId']
 * })
 */
export const extractQueryParams = (
  req: Request,
  options: QueryExtractionOptions = {}
): ExtractedQueryParams => {
  const {
    defaultPage,
    defaultLimit,
    includeEntityId = false,
    customFields = [],
  } = options

  // Extract pagination
  // If defaultPage/defaultLimit are undefined, don't provide defaults (for optional pagination)
  const page = typeof req.query.page === 'number' 
    ? req.query.page 
    : (defaultPage !== undefined ? defaultPage : undefined)
  const limit = typeof req.query.limit === 'number' 
    ? req.query.limit 
    : (defaultLimit !== undefined ? defaultLimit : undefined)

  const result: ExtractedQueryParams = {
    page,
    limit,
  }

  // Extract entityId if requested
  if (includeEntityId) {
    result.entityId = (typeof req.query.entityId === 'string' || req.query.entityId === null)
      ? req.query.entityId
      : undefined
  }

  // Extract search parameter
  if (typeof req.query.search === 'string') {
    result.search = req.query.search.trim() || undefined
  }

  // Extract custom fields
  for (const field of customFields) {
    const value = req.query[field]
    if (value !== undefined) {
      // Handle different types appropriately
      if (typeof value === 'string') {
        result[field] = value
      } else if (typeof value === 'number') {
        result[field] = value
      } else if (typeof value === 'boolean') {
        result[field] = value
      } else if (value === null) {
        result[field] = null
      }
    }
  }

  return result
}

/**
 * Extract pagination parameters only (page and limit)
 * Convenience function for endpoints that only need pagination
 * 
 * @param req - Express request object
 * @param defaultPage - Default page value (default: 1)
 * @param defaultLimit - Default limit value (default: 10)
 * @returns Object with page, limit, and optional search
 */
export const extractPaginationParams = (
  req: Request,
  defaultPage: number = 1,
  defaultLimit: number = 10
): { page: number; limit: number; search?: string } => {
  return {
    page: typeof req.query.page === 'number' ? req.query.page : defaultPage,
    limit: typeof req.query.limit === 'number' ? req.query.limit : defaultLimit,
    search: typeof req.query.search === 'string' ? (req.query.search.trim() || undefined) : undefined,
  }
}

/**
 * Extract list query parameters (pagination + entityId + search)
 * Convenience function for standard list endpoints
 * 
 * @param req - Express request object
 * @param defaultPage - Default page value (default: 1)
 * @param defaultLimit - Default limit value (default: 10)
 * @returns Object with page, limit, entityId, and optional search
 */
export const extractListQueryParams = (
  req: Request,
  defaultPage: number = 1,
  defaultLimit: number = 10
): { page: number; limit: number; entityId: string | null | undefined; search?: string } => {
  return {
    page: typeof req.query.page === 'number' ? req.query.page : defaultPage,
    limit: typeof req.query.limit === 'number' ? req.query.limit : defaultLimit,
    entityId: (typeof req.query.entityId === 'string' || req.query.entityId === null)
      ? req.query.entityId
      : undefined,
    search: typeof req.query.search === 'string' ? (req.query.search.trim() || undefined) : undefined,
  }
}

