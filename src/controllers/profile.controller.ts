import type { Request, Response } from "express"
import { createProfileService } from "../services/profile.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { isValidUUID } from "../utils/uuidValidation"

const profileService = createProfileService()

export const getById = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.getProfileById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profile, "Profile retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.createProfile(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, profile, "Profile created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.updateProfile(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profile, "Profile updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await profileService.deleteProfile(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Profile deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Validate and parse pagination parameters
    const page = req.query.page ? Number(req.query.page) : 1
    const limit = req.query.limit ? Number(req.query.limit) : 10
    
    // Validate page and limit
    if (page < 1 || !Number.isInteger(page)) {
      throw new Error('page parameter must be a positive integer')
    }
    if (limit < 1 || limit > 100 || !Number.isInteger(limit)) {
      throw new Error('limit parameter must be between 1 and 100')
    }
    
    // Handle query param: "null" string, empty string, undefined, or actual entity ID
    let entityId: string | null | undefined = req.query.entityId as string | undefined
    
    // Convert string "null" or empty string to actual null
    if (entityId === "null" || entityId === "" || entityId === undefined) {
      entityId = null
    } else if (entityId && !isValidUUID(entityId)) {
      throw new Error('entityId parameter must be a valid UUID')
    }
    
    const result = await profileService.listProfiles(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Profiles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

