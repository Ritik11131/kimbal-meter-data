import { createBaseRepository } from "./base.repository"
import { User } from "../models/User" // Your Sequelize User model class
import type { User as UserType, CreateUserDTO, UpdateUserDTO } from "../types/users"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

export const createUserRepository = () => {
  const baseRepo = createBaseRepository(User)

  const findById = async (id: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { id, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByEmail = async (email: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { email, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByMobileNo = async (mobileNo: string): Promise<UserType | null> => {
    const userInstance = await User.findOne({ where: { mobile_no: mobileNo, is_deleted: false } })
    if (!userInstance) return null
    return userInstance.get() as UserType
  }

  const findByEntityId = async (entityId: string): Promise<UserType[]> => {
    const users = await User.findAll({
      where: { entity_id: entityId, is_deleted: false },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  const create = async (
    data: CreateUserDTO,
    passwordHash: string,
    salt: string,
    createdBy?: string
  ): Promise<UserType> => {
    const userInstance = await User.create({
     email: data.email,
      mobile_no: data.mobile_no,
      name: data.name,
      password_hash: passwordHash,
      salt: salt,
      entity_id: data.entity_id,
      role_id: data.role_id,
      created_by: createdBy || null,
    })
    return userInstance.get() as UserType
  }

  const update = async (id: string, data: UpdateUserDTO): Promise<UserType | null> => {
    const userInstance = await User.findByPk(id)
    if (!userInstance) return null

    const updateData: Partial<UpdateUserDTO> = {}
     if (data.email !== undefined) updateData.email = data.email
    if (data.mobile_no !== undefined) updateData.mobile_no = data.mobile_no
    if (data.name !== undefined) updateData.name = data.name
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    await userInstance.update(updateData)
    return userInstance.get() as UserType
  }

  const softDelete = async (id: string): Promise<number> => {
    const user = await User.findByPk(id)
    if (!user) return 0
    await user.update({ is_deleted: true })
    return 1
  }

  const findByRoleId = async (roleId: string): Promise<UserType[]> => {
    const users = await User.findAll({
      where: { role_id: roleId, is_deleted: false },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  const changePassword = async (id: string, passwordHash: string, salt: string): Promise<UserType | null> => {
    const userInstance = await User.findByPk(id)
    if (!userInstance) return null
    await userInstance.update({ password_hash: passwordHash, salt })
    return userInstance.get() as UserType
  }

  const findByAccessibleEntities = async (userEntityId: string): Promise<UserType[]> => {
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    const users = await User.findAll({
      where: { 
        entity_id: {
          [Op.in]: accessibleIds
        },
        is_deleted: false 
      },
      order: [["creation_time", "DESC"]],
    })
    return users.map(user => user.get() as UserType)
  }

  return {
    ...baseRepo,
    findById,
    findByEmail,
    findByMobileNo,
    findByEntityId,
    create,
    update,
    softDelete,
    findByRoleId,
    changePassword,
    findByAccessibleEntities,
  }
}
