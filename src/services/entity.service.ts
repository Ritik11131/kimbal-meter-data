import type { Entity, CreateEntityDTO, UpdateEntityDTO } from '../types/entities';
import type { EntityTreeWithSelection, EntityHierarchyResponse } from '../types/search';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';
import logger from '../utils/logger';
import type { AuthContext } from '../types/common';
import { createEntityRepository } from '../repositories/entity.repository';
import { validateEntityAccess, getAccessibleEntityIds } from '../utils/hierarchy';
import { withTransaction } from '../utils/transactions';
import { isRootAdmin } from '../utils/rootAdmin';

type EntityTree = Entity & { children: EntityTree[] };

export const createEntityService = () => {
  const entityRepository = createEntityRepository();

  /**
   * Retrieves an entity by ID and validates user access
   * @param id - Entity ID
   * @param user - Authenticated user context
   * @returns Entity object
   */
  const getEntityById = async (id: string, user: AuthContext): Promise<Entity> => {
    const entity = await entityRepository.findById(id);
    if (!entity) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    await validateEntityAccess(user.entityId, id, "entity");
    return entity;
  };

  /**
   * Builds a nested tree structure from flat array of entities
   * @param entities - Flat array of entities
   * @param rootEntityId - ID of the root entity
   * @param paginateChildren - Optional pagination for root children
   * @returns Entity tree structure or null if no entities
   */
  const buildEntityTree = (
    entities: Entity[], 
    rootEntityId: string, 
    paginateChildren?: { page: number; limit: number }
  ): EntityTree | null => {
    if (entities.length === 0) return null;

    const entityMap = new Map<string, EntityTree>();
    
    entities.forEach(entity => {
      entityMap.set(entity.id, {
        ...entity,
        children: [],
      });
    });

    const rootEntity = entityMap.get(rootEntityId);
    if (!rootEntity) return null;

    const childrenByParent = new Map<string, Entity[]>();
    entities.forEach(entity => {
      if (entity.id !== rootEntityId && entity.entity_id) {
        if (!childrenByParent.has(entity.entity_id)) {
          childrenByParent.set(entity.entity_id, []);
        }
        childrenByParent.get(entity.entity_id)!.push(entity);
      }
    });

    if (paginateChildren && rootEntityId === rootEntity.id) {
      const rootChildren = childrenByParent.get(rootEntityId) || [];
      const sortedChildren = rootChildren.sort((a, b) => 
        new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
      );
      const start = (paginateChildren.page - 1) * paginateChildren.limit;
      const end = start + paginateChildren.limit;
      const paginatedChildren = sortedChildren.slice(start, end);
      
      paginatedChildren.forEach(childEntity => {
        const child = entityMap.get(childEntity.id);
        if (child) {
          rootEntity.children.push(child);
        }
      });
    } else {
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

    const sortChildren = (entity: EntityTree) => {
      entity.children.sort((a, b) => 
        new Date(a.creation_time).getTime() - new Date(b.creation_time).getTime()
      );
      entity.children.forEach(child => sortChildren(child));
    };
    sortChildren(rootEntity);

    return rootEntity;
  };

  /**
   * Retrieves entity hierarchy tree with optional pagination
   * @param entityId - Root entity ID
   * @param user - Authenticated user context
   * @param options - Optional depth, pagination, and paginateRootChildren flag
   * @returns Entity tree with optional pagination metadata
   */
  const getEntityHierarchy = async (
    entityId: string, 
    user: AuthContext,
    options?: { depth?: number; page?: number; limit?: number; paginateRootChildren?: boolean; search?: string }
  ): Promise<EntityTree & { totalChildren?: number; page?: number; limit?: number; totalPages?: number }> => {
    try {
      await validateEntityAccess(user.entityId, entityId);
      
      const depth = options?.depth;
      const paginateRootChildren = options?.paginateRootChildren ?? false;
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      
      if (paginateRootChildren) {
        const rootEntity = await entityRepository.findById(entityId);
        if (!rootEntity) {
          throw new AppError('Entity not found', HTTP_STATUS.NOT_FOUND);
        }
        
        const search = options?.search;
        const { data: children, total } = await entityRepository.findDirectChildren(entityId, page, limit, search);
        
        const tree: EntityTree & { totalChildren: number; page: number; limit: number; totalPages: number } = {
          ...rootEntity,
          children: children.map(child => ({
          ...child,
          children: [],
        })) as EntityTree[],
          totalChildren: total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
        
        return tree;
      }
      
      const entities = await entityRepository.findHierarchy(entityId, depth);
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

  /**
   * Creates a new entity
   * @param data - Entity creation data
   * @param user - Authenticated user context
   * @returns Created entity
   */
  const createEntity = async (data: CreateEntityDTO, user: AuthContext): Promise<Entity> => {
    try {
      return await withTransaction(async () => {
        if (data.entity_id) {
          const parentEntity = await entityRepository.findById(data.entity_id);
          if (!parentEntity) {
            throw new AppError('Parent entity not found', HTTP_STATUS.NOT_FOUND);
          }
          await validateEntityAccess(user.entityId, data.entity_id, "entities");
        }
        return await entityRepository.createEntity(data, user.userId);
      });
    } catch (error) {
      logger.error('Error creating entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  /**
   * Updates an existing entity
   * @param id - Entity ID
   * @param data - Entity update data
   * @param user - Authenticated user context
   * @returns Updated entity
   */
  const updateEntity = async (
    id: string,
    data: UpdateEntityDTO,
    user: AuthContext
  ): Promise<Entity> => {
    try {
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

  /**
   * Deletes an entity
   * @param id - Entity ID
   * @param user - Authenticated user context
   */
  const deleteEntity = async (id: string, user: AuthContext): Promise<void> => {
    try {
      await getEntityById(id, user);
      
      const children = await entityRepository.findDirectChildren(id, 1, 1);
      if (children.total > 0) {
        throw new AppError(
          'Cannot delete entity: Entity has child entities. Please delete or reassign child entities first.',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      await entityRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  /**
   * Lists entities with pagination and optional filters
   * @param page - Page number
   * @param limit - Items per page
   * @param profileId - Optional profile filter
   * @param entityId - Optional entity filter (for listing children)
   * @param user - Authenticated user context
   * @param search - Optional search term
   * @returns Paginated entity list
   */
  const listEntities = async (page = 1, limit = 10, profileId?: string, entityId?: string | null, user?: AuthContext, search?: string) => {
    try {
      if (entityId !== null && entityId !== undefined) {
        const { data, total } = await entityRepository.paginateEntities(page, limit, profileId, undefined, entityId, search);
        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }

      let accessibleEntityIds: string[] | undefined;
      
      if (user) {
        const isRoot = await isRootAdmin(user.entityId);
        
        if (isRoot) {
          accessibleEntityIds = undefined;
        } else {
          accessibleEntityIds = await getAccessibleEntityIds(user.entityId);
        }
      }

      const { data, total } = await entityRepository.paginateEntities(page, limit, profileId, accessibleEntityIds, undefined, search);
      
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error listing entities:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  /**
   * Marks a selected entity in the hierarchy tree
   * @param tree - Entity tree
   * @param selectedEntityId - ID of the selected entity
   * @returns Tree with isSelected markers
   */
  const markSelectedEntity = (
    tree: EntityTree,
    selectedEntityId: string
  ): EntityTreeWithSelection => {
    const markRecursive = (node: EntityTree): EntityTreeWithSelection => {
      const isSelected = node.id === selectedEntityId;
      return {
        ...node,
        isSelected,
        children: node.children.map(child => markRecursive(child)),
      };
    };
    return markRecursive(tree);
  };

  /**
   * Gets entity hierarchy starting from logged-in user's entity, showing selected entity
   * @param selectedEntityId - The entity to find in hierarchy
   * @param user - Authenticated user context
   * @param options - Optional depth, pagination
   * @returns Hierarchy response with user's entity as root and selected entity marked
   */
  const getEntityHierarchyFromUserEntity = async (
    selectedEntityId: string,
    user: AuthContext,
    options?: { depth?: number; page?: number; limit?: number; paginateRootChildren?: boolean }
  ): Promise<EntityHierarchyResponse> => {
    try {
      // Validate access to selected entity
      await validateEntityAccess(user.entityId, selectedEntityId, "entity");

      // Get selected entity info
      const selectedEntity = await entityRepository.findById(selectedEntityId);
      if (!selectedEntity) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      // Get user's entity info
      const userEntity = await entityRepository.findById(user.entityId);
      if (!userEntity) {
        throw new AppError("User entity not found", HTTP_STATUS.NOT_FOUND);
      }

      // Get hierarchy from user's entity
      const hierarchy = await getEntityHierarchy(user.entityId, user, options);
      
      // Mark selected entity in the tree
      const hierarchyWithSelection = markSelectedEntity(hierarchy, selectedEntityId);

      return {
        userEntity: {
          id: userEntity.id,
          name: userEntity.name,
          email_id: userEntity.email_id,
        },
        selectedResource: {
          type: "entity",
          id: selectedEntity.id,
          name: selectedEntity.name,
        },
        hierarchy: hierarchyWithSelection,
      };
    } catch (error) {
      logger.error('Error fetching entity hierarchy from user entity:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(ERROR_MESSAGES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  };

  return {
    getEntityById,
    getEntityHierarchy,
    getEntityHierarchyFromUserEntity,
    markSelectedEntity,
    createEntity,
    updateEntity,
    deleteEntity,
    listEntities,
  };
};
