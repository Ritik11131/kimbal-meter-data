import type { BaseEntity } from "./common"

export interface Entity extends BaseEntity {
  id: string
  entity_id: string | null
  name: string
  email_id: string
  mobile_no: string | null
  profile_id: string
  attributes: Record<string, any> | null
  created_by: string | null
  creation_time: Date
  last_update_on: Date
}

export interface CreateEntityDTO {
  name: string
  email_id: string
  mobile_no: string | null
  profile_id: string
  entity_id?: string | null
  attributes?: Record<string, any> | null
}

export interface UpdateEntityDTO {
  name?: string
  email_id?: string
  mobile_no?: string | null
  attributes?: Record<string, any> | null
}

export interface Profile extends BaseEntity {
  id: string
  name: string
  entity_id: string | null
  attributes: Record<string, any> | null
  created_by: string | null
  creation_time: Date
  last_update_on: Date
}

export interface Role extends BaseEntity {
  id: string
  entity_id: string | null
  name: string
  attributes: {
    roles: Array<{
      moduleId: string
      name: string
      read: boolean
      write: boolean
    }>
  } | null
  created_by: string | null
  creation_time: Date
  last_update_on: Date
}

export interface Meter extends BaseEntity {
  id: string
  entity_id: string
  name: string
  meter_type: "PHYSICAL" | "VIRTUAL" | "GROUP"
  attributes: Record<string, any> | null
  tb_ref_id: string | null
  tb_token: string | null
  created_by: string
  creation_time: Date
  last_update_on: Date
}

export interface Module extends BaseEntity {
  id: string
  name: string
  created_by: string
  creation_time: Date
  last_update_on: Date
}

export interface CreateProfileDTO {
  name: string
  entity_id?: string | null
  attributes?: Record<string, any> | null
}

export interface UpdateProfileDTO {
  name?: string
  attributes?: Record<string, any> | null
}

export interface CreateMeterDTO {
  entity_id: string
  name: string
  meter_type: "PHYSICAL" | "VIRTUAL" | "GROUP"
  attributes?: Record<string, any> | null
  tb_ref_id?: string | null
  tb_token?: string | null
}

export interface UpdateMeterDTO {
  name?: string
  meter_type?: "PHYSICAL" | "VIRTUAL" | "GROUP"
  attributes?: Record<string, any> | null
  tb_ref_id?: string | null
  tb_token?: string | null
}

export interface CreateModuleDTO {
  name: string
}

export interface UpdateModuleDTO {
  name?: string
}

export interface EntityMeter {
  entity_id: string
  meter_id: string
  creation_time: Date
  last_update_on: Date
}
