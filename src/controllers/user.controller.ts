import type { Request, Response } from "express"
import { sendResponse } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"
import { createUserService } from "../services/user.service"

const userService = createUserService()

export const getById = async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id, req.user!)
  sendResponse(res, HTTP_STATUS.OK, user, "User retrieved", req.path)
}

export const create = async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body, req.user!)
  sendResponse(res, HTTP_STATUS.CREATED, user, "User created", req.path)
}

export const update = async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user!)
  sendResponse(res, HTTP_STATUS.OK, user, "User updated", req.path)
}

export const remove = async (req: Request, res: Response) => {
  await userService.deleteUser(req.params.id, req.user!)
  sendResponse(res, HTTP_STATUS.OK, null, "User deleted", req.path)
}

export const listByEntity = async (req: Request, res: Response) => {
  const users = await userService.listUsersByEntity(req.params.entityId, req.user!)
  sendResponse(res, HTTP_STATUS.OK, users, "Users listed", req.path)
}

export const changePassword = async (req: Request, res: Response) => {
  await userService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword)
  sendResponse(res, HTTP_STATUS.OK, null, "Password changed", req.path)
}
