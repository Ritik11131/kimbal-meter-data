import type { Request, Response } from "express"
import { createSearchService } from "../services/search.service"
import { createEntityService } from "../services/entity.service"
import { createUserService } from "../services/user.service"
import { createProfileService } from "../services/profile.service"
import { createRoleService } from "../services/role.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { AppError } from "../middleware/errorHandler"
import { extractQueryParams } from "../utils/queryExtraction"
import type { SearchResourceType } from "../types/search"

const searchService = createSearchService()
const entityService = createEntityService()
const userService = createUserService()
const profileService = createProfileService()
const roleService = createRoleService()

/**
 * Global search across all resource types
 * @param req - Express request object containing query parameters (q, type, page, limit)
 * @param res - Express response object
 */
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q, type, page, limit } = extractQueryParams(req, {
      defaultPage: 1,
      defaultLimit: 10,
      customFields: ["q", "type"],
    })

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      throw new AppError("Search query (q) is required", HTTP_STATUS.BAD_REQUEST)
    }

    // Parse type filter - can be single type or comma-separated
    let types: SearchResourceType[] | undefined
    if (type) {
      if (typeof type === "string") {
        const typeArray = type.split(",").map((t) => t.trim()) as SearchResourceType[]
        const validTypes: SearchResourceType[] = ["entity", "user", "profile", "role"]
        const invalidTypes = typeArray.filter((t) => !validTypes.includes(t))
        if (invalidTypes.length > 0) {
          throw new AppError(`Invalid resource types: ${invalidTypes.join(", ")}`, HTTP_STATUS.BAD_REQUEST)
        }
        types = typeArray
      }
    }

    const pageNum = (page as number) || 1
    const limitNum = (limit as number) || 10

    const results = await searchService.globalSearch(q.trim(), types, pageNum, limitNum, req.user!)

    // Calculate total results across all categories
    const totalResults =
      results.entities.total + results.users.total + results.profiles.total + results.roles.total

    sendResponse(
      res,
      HTTP_STATUS.OK,
      {
        ...results,
        pagination: {
          totalResults,
          hasMore:
            results.entities.totalPages > pageNum ||
            results.users.totalPages > pageNum ||
            results.profiles.totalPages > pageNum ||
            results.roles.totalPages > pageNum,
        },
      },
      "Search results retrieved",
      req.path
    )
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Get hierarchy for any resource type
 * @param req - Express request object containing type and id in params, and optional query parameters
 * @param res - Express response object
 */
export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params
    const extracted = extractQueryParams(req, {
      defaultPage: undefined,
      defaultLimit: undefined,
      customFields: ["depth", "paginateRootChildren"],
    })

    const depth = extracted.depth as number | undefined
    const page = extracted.page as number | undefined
    const limit = extracted.limit as number | undefined
    const paginateRootChildren = extracted.paginateRootChildren as boolean | undefined

    // Validate resource type
    const validTypes: SearchResourceType[] = ["entity", "user", "profile", "role"]
    if (!validTypes.includes(type as SearchResourceType)) {
      throw new AppError(
        `Invalid resource type. Must be one of: ${validTypes.join(", ")}`,
        HTTP_STATUS.BAD_REQUEST
      )
    }

    // Route to appropriate service based on type
    switch (type) {
      case "entity": {
        const options = {
          depth,
          page,
          limit,
          paginateRootChildren: paginateRootChildren || false,
        }
        const hierarchy = await entityService.getEntityHierarchy(id, req.user!, options)
        sendResponse(res, HTTP_STATUS.OK, hierarchy, "Entity hierarchy retrieved", req.path)
        break
      }

      case "user": {
        const options = { depth }
        const hierarchy = await userService.getUserHierarchy(id, req.user!, options)
        sendResponse(res, HTTP_STATUS.OK, hierarchy, "User hierarchy retrieved", req.path)
        break
      }

      case "profile": {
        const options = { depth }
        const hierarchy = await profileService.getProfileHierarchy(id, req.user!, options)
        sendResponse(res, HTTP_STATUS.OK, hierarchy, "Profile hierarchy retrieved", req.path)
        break
      }

      case "role": {
        const options = { depth }
        const hierarchy = await roleService.getRoleHierarchy(id, req.user!, options)
        sendResponse(res, HTTP_STATUS.OK, hierarchy, "Role hierarchy retrieved", req.path)
        break
      }

      default:
        throw new AppError("Invalid resource type", HTTP_STATUS.BAD_REQUEST)
    }
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

