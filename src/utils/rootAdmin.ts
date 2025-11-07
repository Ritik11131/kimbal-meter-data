import { Entity } from "../models/Entity"

/**
 * Check if a user is root admin (entity has no parent)
 * Extracted to shared utility to avoid code duplication
 * 
 * @param userEntityId - The entity ID of the user
 * @returns true if the entity is root (entity_id is null), false otherwise
 */
export const isRootAdmin = async (userEntityId: string): Promise<boolean> => {
  const entity = await Entity.findByPk(userEntityId)
  if (!entity) return false
  return entity.entity_id === null
}

