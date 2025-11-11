import type { Request, Response } from "express"
import { createProfileService } from "../services/profile.service"
import { sendResponse, sendError } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

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
    // Query parameters are validated by validateQuery middleware
    const page = typeof req.query.page === 'number' ? req.query.page : 1
    const limit = typeof req.query.limit === 'number' ? req.query.limit : 10
    const entityId = (typeof req.query.entityId === 'string' || req.query.entityId === null) ? req.query.entityId : undefined
    
    const result = await profileService.listProfiles(entityId, req.user!, page, limit)
    sendResponse(res, HTTP_STATUS.OK, result, "Profiles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message, req.path)
  }
}

