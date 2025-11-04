import type { Request, Response } from "express"
import { createRoleService } from "../services/role.service"
import { sendResponse } from "../utils/response"
import { HTTP_STATUS } from "../config/constants"

const roleService = createRoleService()

export const getById = async (req: Request, res: Response) => {
  const role = await roleService.getRoleById(req.params.id, req.user!)
  sendResponse(res, HTTP_STATUS.OK, role, "Role retrieved", req.path)
}

export const create = async (req: Request, res: Response) => {
  const role = await roleService.createRole(req.body.name, req.body.permissions, req.body.entityId, req.user!)
  sendResponse(res, HTTP_STATUS.CREATED, role, "Role created", req.path)
}

export const update = async (req: Request, res: Response) => {
  const role = await roleService.updateRole(req.params.id, req.user!, req.body.name, req.body.permissions)
  sendResponse(res, HTTP_STATUS.OK, role, "Role updated", req.path)
}

export const listByEntity = async (req: Request, res: Response) => {
  // Handle query param: "null" string, empty string, undefined, or actual entity ID
  let entityId: string | null | undefined = req.params.entityId || req.query.entityId as string | undefined
  
  // Convert string "null" or empty string to actual null
  if (entityId === "null" || entityId === "" || entityId === undefined) {
    entityId = null
  }
  
  const roles = await roleService.listRolesByEntity(entityId, req.user!)
  sendResponse(res, HTTP_STATUS.OK, roles, "Roles listed", req.path)
}
