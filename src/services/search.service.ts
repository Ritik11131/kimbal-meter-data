import { createSearchRepository } from "../repositories/search.repository"
import type { GlobalSearchResult, SearchResourceType } from "../types/search"
import type { AuthContext } from "../types/common"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { isRootAdmin } from "../utils/rootAdmin"
import { AppError } from "../middleware/errorHandler"
import { HTTP_STATUS, ERROR_MESSAGES } from "../config/constants"
import logger from "../utils/logger"

export const createSearchService = () => {
  const searchRepo = createSearchRepository()

  /**
   * Global search across all resource types
   * @param query - Search query string
   * @param types - Optional array of resource types to search (if not provided, searches all)
   * @param page - Page number
   * @param limit - Items per page
   * @param user - Authenticated user context
   * @returns Global search results grouped by resource type
   */
  const globalSearch = async (
    query: string,
    types: SearchResourceType[] | undefined,
    page: number,
    limit: number,
    user: AuthContext
  ): Promise<GlobalSearchResult> => {
    try {
      // Determine accessible entity IDs
      const isRoot = await isRootAdmin(user.entityId)
      const accessibleEntityIds = isRoot ? undefined : await getAccessibleEntityIds(user.entityId)

      // Determine which types to search
      const typesToSearch: SearchResourceType[] = types || ["entity", "user", "profile", "role"]

      // Execute searches in parallel for better performance
      const searchPromises: Promise<any>[] = []

      if (typesToSearch.includes("entity")) {
        searchPromises.push(
          searchRepo.searchEntities(query, page, limit, accessibleEntityIds)
        )
      } else {
        searchPromises.push(
          Promise.resolve({ data: [], total: 0, page, limit, totalPages: 0 })
        )
      }

      if (typesToSearch.includes("user")) {
        searchPromises.push(
          searchRepo.searchUsers(query, page, limit, accessibleEntityIds)
        )
      } else {
        searchPromises.push(
          Promise.resolve({ data: [], total: 0, page, limit, totalPages: 0 })
        )
      }

      if (typesToSearch.includes("profile")) {
        searchPromises.push(
          searchRepo.searchProfiles(query, page, limit, accessibleEntityIds)
        )
      } else {
        searchPromises.push(
          Promise.resolve({ data: [], total: 0, page, limit, totalPages: 0 })
        )
      }

      if (typesToSearch.includes("role")) {
        searchPromises.push(
          searchRepo.searchRoles(query, page, limit, accessibleEntityIds)
        )
      } else {
        searchPromises.push(
          Promise.resolve({ data: [], total: 0, page, limit, totalPages: 0 })
        )
      }

      const [entities, users, profiles, roles] = await Promise.all(searchPromises)

      return {
        entities,
        users,
        profiles,
        roles,
      }
    } catch (error) {
      logger.error("Error in global search:", error)
      if (error instanceof AppError) throw error
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
  }

  return {
    globalSearch,
  }
}

