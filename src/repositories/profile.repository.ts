import { createBaseRepository } from "./base.repository"
import { Profile } from "../models/Profile"
import type { Profile as ProfileType, CreateProfileDTO, UpdateProfileDTO } from "../types/entities"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"
import logger from "../utils/logger"

export const createProfileRepository = () => {
  const baseRepo = createBaseRepository(Profile)

  const findByEntityId = async (entityId?: string | null): Promise<ProfileType[]> => {
    const whereClause = entityId === null ? { entity_id: null } : entityId ? { entity_id: entityId } : {}

    return Profile.findAll({
      where: whereClause,
      order: [["creation_time", "DESC"]],
    })
  }

  const findById = async (id: string): Promise<ProfileType | null> => {
    return Profile.findByPk(id)
  }

  const createProfile = async (
    data: CreateProfileDTO,
    createdBy?: string
  ): Promise<ProfileType> => {
    return Profile.create({
      name: data.name,
      entity_id: data.entity_id || null,
      attributes: data.attributes || null,
      created_by: createdBy || null,
    })
  }

  const updateProfile = async (id: string, data: UpdateProfileDTO): Promise<ProfileType | null> => {
    const profile = await Profile.findByPk(id)
    if (!profile) return null

    const updateData: Partial<UpdateProfileDTO> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.attributes !== undefined) updateData.attributes = data.attributes

    await profile.update(updateData)
    return profile
  }

  const findByAccessibleEntities = async (userEntityId: string): Promise<ProfileType[]> => {
    const accessibleIds = await getAccessibleEntityIds(userEntityId)
    return Profile.findAll({
      where: { 
        entity_id: {
          [Op.in]: accessibleIds
        }
      },
      order: [["creation_time", "DESC"]],
    })
  }

  const findAllGlobal = async (): Promise<ProfileType[]> => {
    return Profile.findAll({
      where: { entity_id: null },
      order: [["creation_time", "DESC"]],
    })
  }

  const findAll = async (): Promise<ProfileType[]> => {
    try {
      logger.debug("findAll: Fetching all profiles from database")
      const profiles = await Profile.findAll({
        order: [["creation_time", "DESC"]],
      })
      logger.debug(`findAll: Found ${profiles.length} profiles`)
      return profiles
    } catch (error: any) {
      logger.error("Error finding all profiles:", error)
      logger.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      })
      throw error
    }
  }

  return {
    ...baseRepo,
    findByEntityId,
    findById,
    createProfile,
    updateProfile,
    findByAccessibleEntities,
    findAllGlobal,
    findAll, // Override base findAll with explicit implementation
  }
}

