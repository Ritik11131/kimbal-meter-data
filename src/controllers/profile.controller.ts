import type { Request, Response } from "express"
import { createProfileService } from "../services/profile.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { extractListQueryParams } from "../utils/queryExtraction"

const profileService = createProfileService()

/**
 * Retrieves a profile by ID
 * @param req - Express request object containing profile ID in params
 * @param res - Express response object
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.getProfileById(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profile, "Profile retrieved", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Creates a new profile
 * @param req - Express request object containing profile data in body
 * @param res - Express response object
 */
export const create = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.createProfile(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, profile, "Profile created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Updates an existing profile
 * @param req - Express request object containing profile ID in params and update data in body
 * @param res - Express response object
 */
export const update = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.updateProfile(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profile, "Profile updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Deletes a profile
 * @param req - Express request object containing profile ID in params
 * @param res - Express response object
 */
export const remove = async (req: Request, res: Response) => {
  try {
    await profileService.deleteProfile(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Profile deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

/**
 * Lists profiles with pagination and optional entity filter
 * @param req - Express request object containing query parameters (page, limit, entityId, search)
 * @param res - Express response object
 */
export const list = async (req: Request, res: Response) => {
  try {
    const { page, limit, entityId, search } = extractListQueryParams(req)
    
    const result = await profileService.listProfiles(entityId, req.user!, page, limit, search)
    sendResponse(res, HTTP_STATUS.OK, result, "Profiles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

