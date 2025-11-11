import { createBaseRepository } from "./base.repository"
import { Profile } from "../models/Profile"
import type { Profile as ProfileType, CreateProfileDTO, UpdateProfileDTO } from "../types/entities"
import { getAccessibleEntityIds } from "../utils/hierarchy"
import { Op } from "sequelize"

export const createProfileRepository = () => {
  const baseRepo = createBaseRepository(Profile)

  /**
   * Finds all profiles by entity ID
   * @param entityId - Entity ID (null for global profiles)
   * @returns Array of profiles
   */
  const findByEntityId = async (entityId?: string | null): Promise<ProfileType[]> => {
    const whereClause = entityId === null ? { entity_id: null } : entityId ? { entity_id: entityId } : {}

    return Profile.findAll({
      where: whereClause,
      order: [["creation_time", "DESC"]],
    })
  }

  /**
   * Creates a new profile
   * @param data - Profile creation data
   * @param createdBy - User ID of creator
   * @returns Created profile
   */
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

  /**
   * Updates an existing profile
   * @param id - Profile ID
   * @param data - Profile update data
   * @returns Updated profile or null if not found
   */
  const updateProfile = async (id: string, data: UpdateProfileDTO): Promise<ProfileType | null> => {
    const profile = await Profile.findByPk(id)
    if (!profile) return null

    const updateData: Partial<UpdateProfileDTO> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.attributes !== undefined) updateData.attributes = data.attributes

    await profile.update(updateData)
    return profile
  }

  /**
   * Finds profiles accessible by a user's entity
   * @param userEntityId - User's entity ID
   * @returns Array of accessible profiles
   */
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

  /**
   * Finds all global profiles (entity_id = null)
   * @returns Array of global profiles
   */
  const findAllGlobal = async (): Promise<ProfileType[]> => {
    return Profile.findAll({
      where: { entity_id: null },
      order: [["creation_time", "DESC"]],
    })
  }

  /**
   * Paginates profiles with optional filters
   * @param page - Page number
   * @param limit - Items per page
   * @param entityId - Optional entity ID filter
   * @param accessibleEntityIds - Optional hierarchy filter
   * @returns Paginated profile data
   */
  const paginateProfiles = async (
    page = 1,
    limit = 10,
    entityId?: string | null,
    accessibleEntityIds?: string[]
  ): Promise<{ data: ProfileType[]; total: number }> => {
    const where: any = {}
    
    if (entityId !== null && entityId !== undefined) {
      where.entity_id = entityId === null ? null : entityId
    } else if (accessibleEntityIds !== undefined) {
      if (accessibleEntityIds.length > 0) {
        where.entity_id = {
          [Op.in]: accessibleEntityIds
        }
      } else {
        where.id = { [Op.in]: [] }
      }
    }
    
    return baseRepo.paginate(page, limit, where)
  }

  return {
    ...baseRepo,
    findByEntityId,
    createProfile,
    updateProfile,
    findByAccessibleEntities,
    findAllGlobal,
    paginateProfiles,
  }
}

