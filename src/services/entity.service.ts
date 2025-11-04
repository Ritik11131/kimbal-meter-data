import type { Entity, CreateEntityDTO, UpdateEntityDTO } from '../types/entities';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';
import logger from '../utils/logger';
import type { AuthContext } from '../types/common';
import { createEntityRepository } from '../repositories/entity.repository';
import { validateEntityAccess, getAccessibleEntityIds } from '../utils/hierarchy';
import { Entity as EntityModel } from '../models/Entity';

// Recursive type for entity tree structure
type EntityTree = Entity & { children: EntityTree[] };

/**
 * Check if user is root admin (entity has no parent)
 */
const isRootAdmin = async (userEntityId: string): Promise<boolean> => {
  const entity = await EntityModel.findByPk(userEntityId);
  if (!entity) return false;
  return entity.entity_id === null;
};

export const createEntityService = () => {
  const entityRepository = createEntityRepository();

  const getEntityById = async (id: string, user: AuthContext): Promise<Entity> => {
    const entity = await entityRepository.findById(id);
    if (!entity) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    // Validate user has access to this entity
    await validateEntityAccess(user.entityId, id);
    return entity;
  };

  /**
   * Build a nested tree structure from flat array of entities
   * Each entity gets a 'children' array containing its child entities
   * Supports pagination for optimization
   */
  const buildEntityTree = (
    entities: Entity[], 
    rootEntityId: string, 
    paginateChildren?: { page: number; limit: number }
  ): EntityTree | null => {
    if (entities.length === 0) return null;

    // Repository already returns plain objects, so we can use them directly
    // Create a map for quick lookup
    const entityMap = new Map<string, EntityTree>();
    
    // Initialize all entities with empty children array
    entities.forEach(entity => {
      entityMap.set(entity.id, {
        ...entity,
        children: [],
      });
    });

    // Build the tree structure
    const rootEntity = entityMap.get(rootEntityId);
    if (!rootEntity) return null;

    // Group entities by parent
    const childrenByParent = new Map<string, Entity[]>();
    entities.forEach(entity => {
      if (entity.id !== rootEntityId && entity.entity_id) {
        if (!childrenByParent.has(entity.entity_id)) {
          childrenByParent.set(entity.entity_id, []);
        }
        childrenByParent.get(entity.entity_id)!.push(entity);
      }
    });

    // If pagination is requested for root children, apply it
    if (paginateChildren && rootEntityId === rootEntity.id) {
      const rootChildren = childrenByParent.get(rootEntityId) || [];
      const sortedChildren = rootChildren.sort((a, b) => 
        new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
      );
      const start = (paginateChildren.page - 1) * paginateChildren.limit;
      const end = start + paginateChildren.limit;
      const paginatedChildren = sortedChildren.slice(start, end);
      
      // Only add paginated children to root
      paginatedChildren.forEach(childEntity => {
        const child = entityMap.get(childEntity.id);
        if (child) {
          rootEntity.children.push(child);
        }
      });
    } else {
      // Add all children (no pagination) - entities are already plain objects
      entities.forEach(entity => {
        if (entity.id !== rootEntityId && entity.entity_id) {
          const parent = entityMap.get(entity.entity_id);
          const child = entityMap.get(entity.id);
          if (parent && child) {
            parent.children.push(child);
          }
        }
      });
    }

    // Sort children by creation_time (recursively)
    const sortChildren = (entity: EntityTree) => {
      entity.children.sort((a, b) => 
        new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
      );
      entity.children.forEach(child => sortChildren(child));
    };
    sortChildren(rootEntity);

    return rootEntity;
  };

  const getEntityHierarchy = async (
    entityId: string, 
    user: AuthContext,
    options?: { depth?: number; page?: number; limit?: number; paginateRootChildren?: boolean }
  ): Promise<EntityTree & { totalChildren?: number; page?: number; limit?: number; totalPages?: number }> => {
    try {
      // Validate user has access to this entity
      await validateEntityAccess(user.entityId, entityId);
      
      const depth = options?.depth;
      const paginateRootChildren = options?.paginateRootChildren ?? false;
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      
      // If paginating root children, use optimized query
      if (paginateRootChildren) {
        logger.debug(`getEntityHierarchy: Using paginated mode for root children (page: ${page}, limit: ${limit})`);
        
        // Get root entity
        const rootEntity = await entityRepository.findById(entityId);
        if (!rootEntity) {
          throw new AppError('Entity not found', HTTP_STATUS.NOT_FOUND);
        }
        
        // Get paginated direct children (already plain objects from repository)
        const { data: children, total } = await entityRepository.findDirectChildren(entityId, page, limit);
        
        // Repository already returns plain objects, so we can use them directly
        // Build tree with only paginated children
        const tree: EntityTree & { totalChildren: number; page: number; limit: number; totalPages: number } = {
          ...rootEntity,
          children: children.map(child => ({
            ...child,
            children: [], // Empty children array - can be loaded on demand
          })) as EntityTree[],
          totalChildren: total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
        
        return tree;
      }
      
      // Standard mode: load full hierarchy (with optional depth limit)
      logger.debug(`getEntityHierarchy: Loading full hierarchy (depth: ${depth ?? 'unlimited'})`);
      const entities = await entityRepository.findHierarchy(entityId, depth);
      
      // Build nested tree structure
      const tree = buildEntityTree(entities, entityId);
      
      if (!tree) {
        throw new AppError('Entity hierarchy not found', HTTP_STATUS.NOT_FOUND);
      }
      
      return tree;
    } catch (error) {
      logger.error('Error fetching entity hierarchy:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  const createEntity = async (data: CreateEntityDTO, user: AuthContext): Promise<Entity> => {
    try {
      if (data.entity_id) {
        const parentEntity = await entityRepository.findById(data.entity_id);
        if (!parentEntity) {
          throw new AppError('Parent entity not found', HTTP_STATUS.NOT_FOUND);
        }
        // Validate user can access the parent entity
        await validateEntityAccess(user.entityId, data.entity_id);
      }
      return await entityRepository.createEntity(data, user.userId);
    } catch (error) {
      logger.error('Error creating entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  const updateEntity = async (
    id: string,
    data: UpdateEntityDTO,
    user: AuthContext
  ): Promise<Entity> => {
    try {
      // Validate access before updating
      await getEntityById(id, user);
      const updated = await entityRepository.updateEntity(id, data);
      if (!updated) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
      return updated;
    } catch (error) {
      logger.error('Error updating entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  const deleteEntity = async (id: string, user: AuthContext): Promise<void> => {
    try {
      // Validate access before deleting
      await getEntityById(id, user);
      await entityRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  const listEntities = async (page = 1, limit = 10, profileId?: string, entityId?: string | null, user?: AuthContext) => {
    try {
      // Handle entityId filter - list child entities of a specific entity
      if (entityId !== null && entityId !== undefined) {
        // Validate user has access to the parent entity
        if (user) {
          await validateEntityAccess(user.entityId, entityId);
        }
        logger.debug(`listEntities: Listing child entities of entity: ${entityId}`);
        const { data, total } = await entityRepository.paginateEntities(page, limit, profileId, undefined, entityId);
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }

      // No entityId filter - list all accessible entities (like profiles/roles pattern)
      // Get accessible entity IDs for hierarchy filtering
      let accessibleEntityIds: string[] | undefined;
      
      if (user) {
        const isRoot = await isRootAdmin(user.entityId);
        
        if (isRoot) {
          // Root admin can see all entities (no filtering)
          logger.debug(`listEntities: Root admin - returning all entities (no hierarchy filter)`);
          accessibleEntityIds = undefined; // Don't filter - show all entities
        } else {
          // Non-root users can only see entities from their accessible hierarchy
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId);
          logger.debug(`listEntities: Non-root user ${user.entityId} can access ${accessibleEntityIds.length} entities:`, accessibleEntityIds);
          logger.info(`listEntities: Non-root user ${user.entityId} can access ${accessibleEntityIds.length} entities`);
        }
      } else {
        logger.warn('No user context provided for listEntities');
      }

      const { data, total } = await entityRepository.paginateEntities(page, limit, profileId, accessibleEntityIds, undefined);
      logger.debug(`Returning ${data.length} entities (total: ${total}, page: ${page}, limit: ${limit})`);
      logger.info(`listEntities: Returning ${data.length} entities (total: ${total}, page: ${page}, limit: ${limit}, profileId: ${profileId || 'none'}, entityId: ${entityId || 'none'})`);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error listing entities:', error);
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  return {
    getEntityById,
    getEntityHierarchy,
    createEntity,
    updateEntity,
    deleteEntity,
    listEntities,
  };
};
