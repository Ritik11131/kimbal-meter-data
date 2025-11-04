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
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.createProfile(req.body, req.user!)
    sendResponse(res, HTTP_STATUS.CREATED, profile, "Profile created", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const update = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.updateProfile(req.params.id, req.body, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profile, "Profile updated", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const remove = async (req: Request, res: Response) => {
  try {
    await profileService.deleteProfile(req.params.id, req.user!)
    sendResponse(res, HTTP_STATUS.OK, null, "Profile deleted", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

export const list = async (req: Request, res: Response) => {
  try {
    // Handle query param: "null" string, empty string, undefined, or actual entity ID
    let entityId: string | null | undefined = req.query.entityId as string | undefined
    
    // Convert string "null" or empty string to actual null
    if (entityId === "null" || entityId === "" || entityId === undefined) {
      entityId = null
    }
    
    const profiles = await profileService.listProfiles(entityId, req.user!)
    sendResponse(res, HTTP_STATUS.OK, profiles, "Profiles listed", req.path)
  } catch (error: any) {
    sendError(res, error.statusCode || 500, error.message, req.path)
  }
}

