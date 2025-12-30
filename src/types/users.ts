import type { BaseEntity, PermissionSet } from "./common"

export interface User extends BaseEntity {
  id: string
  entity_id: string
  email: string
  mobile_no: string
  name: string
  password_hash: string
  salt: string
  is_active: boolean
  is_deleted: boolean
  attributes: Record<string, any> | null
  created_by: string | null
  creation_time: Date
  last_update_on: Date
  role_id: string
  entity?: {
    name: string | null
    email_id: string | null
  }
  role?: {
    name: string | null
    permissions: Array<{
      moduleId: string
      name: string
      read: boolean
      write: boolean
    }> | null
  }
}

export interface UserWithoutPassword extends Omit<User, "password_hash" | "salt"> {}

export interface CreateUserDTO {
  email: string
  mobile_no: string
  name: string
  password: string
  entity_id: string
  role_id: string
}

export interface UpdateUserDTO {
  email?: string
  mobile_no?: string
  name?: string
  is_active?: boolean
  attributes?: Record<string, any> | null
}

export interface LoginDTO {
  email: string
  password: string
}

export interface AuthResponse {
  user: UserWithoutPassword
  token: string
  expiresIn: string
}

export interface JwtPayload {
  userId: string
  entityId: string
  roleId: string
  email: string
  permissions: PermissionSet[]
}
