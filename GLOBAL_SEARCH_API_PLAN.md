# 🔍 Global Search API - Design Document

## Overview

A unified global search API that allows searching across **Entities**, **Users**, **Profiles**, and **Roles** with category-wise results and hierarchy support. This API will power the topbar search functionality in the frontend.

---

## Requirements

### 1. Search Functionality
- Search across multiple resource types: Entities, Users, Profiles, Roles, **Meters**
- Category-wise grouping of results
- Pagination support
- Filter by resource type (optional)
- Respect entity access control (users can only see accessible entities)

### 2. Hierarchy Support
- After selecting a result, show **ONLY the exact path** from logged-in user's entity to the selected resource
- **NOT the full tree** - only the direct path (no siblings, no other children)
- **Example**: If searching for a meter "X" under entity "Patanjali Customer":
  - Show: Ritik (Root) → KMP Admin → Patanjali Customer → X Consumer → Meter X
  - **NOT**: Full tree with all children of each entity
- **Entities**: Show path from user's entity to selected entity
- **Users**: Show entity path from user's entity to user's entity, then user hierarchy path from logged-in user to selected user
- **Profiles**: Show entity path from user's entity to profile's entity, then user path from logged-in user to profile creator
- **Roles**: Show entity path from user's entity to role's entity, then user path from logged-in user to role creator
- **Meters**: Show entity path from user's entity to meter's entity, then user path from logged-in user to meter creator, then the meter

### 3. Access Control
- Users can only search within their accessible entity hierarchy
- Root admin can search across all resources
- Entity admins can search within their entity and descendant entities

---

## API Endpoints

### 1. Global Search Endpoint

**`GET /api/search`**

#### Query Parameters
- `q` (required): Search query string
- `type` (optional): Filter by resource type (`entity`, `user`, `profile`, `role`, or comma-separated like `entity,user`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

#### Response Structure
```json
{
  "success": true,
  "message": "Search results retrieved",
  "data": {
    "entities": {
      "data": [...],
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    },
    "users": {
      "data": [...],
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "profiles": {
      "data": [...],
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "roles": {
      "data": [...],
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  },
  "pagination": {
    "totalResults": 31,
    "hasMore": true
  },
  "timestamp": 1234567890,
  "path": "/api/search"
}
```

#### Example Requests
```bash
# Search everything
GET /api/search?q=john&page=1&limit=10

# Search only entities and users
GET /api/search?q=energy&type=entity,user

# Search only profiles
GET /api/search?q=admin&type=profile
```

---

### 2. Get Hierarchy Endpoint

**`GET /api/search/:type/:id/hierarchy`**

#### Path Parameters
- `type`: Resource type (`entity`, `user`, `profile`, `role`, `meter`)
- `id`: Resource ID (UUID)

#### Query Parameters
- `depth` (optional): Maximum depth levels (default: unlimited)
- `page` (optional): Page number (for paginated root children)
- `limit` (optional): Items per page (for paginated root children)
- `paginateRootChildren` (optional): Enable pagination for root's direct children (boolean)

#### Response Structure

**Important**: All hierarchy responses show **ONLY the exact path** from logged-in user's entity to the selected resource. No siblings, no other children - just the direct path.

**For Entities**:
```json
{
  "success": true,
  "message": "Entity hierarchy retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)"
    },
    "selectedResource": {
      "type": "entity",
      "id": "patanjali-entity-id",
      "name": "Patanjali Customer"
    },
    "path": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "patanjali-entity-id",
        "name": "Patanjali Customer",
        "type": "entity",
        "isSelected": true
      }
    ]
  }
}
```

**For Meters**:
```json
{
  "success": true,
  "message": "Meter hierarchy retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)"
    },
    "selectedResource": {
      "type": "meter",
      "id": "meter-x-id",
      "name": "Meter X",
      "entityId": "x-consumer-entity-id"
    },
    "meter": {
      "id": "meter-x-id",
      "name": "Meter X",
      "entity_id": "x-consumer-entity-id"
    },
    "entityPath": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "patanjali-entity-id",
        "name": "Patanjali Customer",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "x-consumer-entity-id",
        "name": "X Consumer",
        "type": "entity",
        "isSelected": false
      }
    ],
    "userPath": [
      {
        "id": "logged-in-user-id",
        "name": "Logged In User",
        "type": "user",
        "isSelected": false
      },
      {
        "id": "meter-creator-id",
        "name": "Meter Creator",
        "type": "user",
        "isSelected": true
      }
    ]
  }
}
```

**For Users**:
```json
{
  "success": true,
  "message": "User hierarchy retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)"
    },
    "selectedResource": {
      "type": "user",
      "id": "jane-user-id",
      "name": "Jane Doe",
      "entityId": "patanjali-entity-id"
    },
    "entityPath": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "patanjali-entity-id",
        "name": "Patanjali Customer",
        "type": "entity",
        "isSelected": false
      }
    ],
    "userPath": [
      {
        "id": "john-user-id",
        "name": "John Doe",
        "type": "user",
        "isSelected": false
      },
      {
        "id": "jane-user-id",
        "name": "Jane Doe",
        "type": "user",
        "isSelected": true
      }
    ]
  }
}
```

**For Profiles**:
```json
{
  "success": true,
  "message": "Profile hierarchy retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)"
    },
    "selectedResource": {
      "type": "profile",
      "id": "profile-id",
      "name": "Tenant Profile",
      "entityId": "kmp-entity-id"
    },
    "profile": {
      "id": "profile-id",
      "name": "Tenant Profile"
    },
    "entityPath": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false
      }
    ],
    "userPath": [
      {
        "id": "logged-in-user-id",
        "name": "Logged In User",
        "type": "user",
        "isSelected": false
      },
      {
        "id": "profile-creator-id",
        "name": "Profile Creator",
        "type": "user",
        "isSelected": true
      }
    ]
  }
}
```

**For Roles**:
```json
{
  "success": true,
  "message": "Role hierarchy retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)"
    },
    "selectedResource": {
      "type": "role",
      "id": "role-id",
      "name": "Admin Role",
      "entityId": "kmp-entity-id"
    },
    "role": {
      "id": "role-id",
      "name": "Admin Role"
    },
    "entityPath": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false
      }
    ],
    "userPath": [
      {
        "id": "logged-in-user-id",
        "name": "Logged In User",
        "type": "user",
        "isSelected": false
      },
      {
        "id": "role-creator-id",
        "name": "Role Creator",
        "type": "user",
        "isSelected": true
      }
    ]
  }
}
```

---

## Implementation Plan

### Phase 1: Repository Layer

#### 1.1 Create `search.repository.ts`
- `searchEntities()`: Search entities by name, email, mobile_no
- `searchUsers()`: Search users by name, email, mobile_no
- `searchProfiles()`: Search profiles by name
- `searchRoles()`: Search roles by name
- All methods should:
  - Respect accessible entity IDs
  - Support pagination
  - Support search term filtering

#### 1.2 Extend `user.repository.ts`
- `findUserHierarchy()`: Find user hierarchy via `created_by` relationship (recursive CTE)
- Similar to `findHierarchy()` in entity repository

#### 1.3 Extend `profile.repository.ts` and `role.repository.ts`
- Add methods to get associated entity hierarchy
- Profiles/Roles don't have their own hierarchy, but they belong to entities
- Return profile/role with its entity hierarchy

### Phase 2: Service Layer

#### 2.1 Create `search.service.ts`
- `globalSearch()`: Main search function
  - Accepts query, type filter, pagination params
  - Calls respective repository methods
  - Groups results by category (including meters)
  - Returns paginated, categorized results

#### 2.2 Extend `entity.service.ts`
- `getEntityPath()`: Get exact path from user's entity to selected entity
  - Uses ancestor chain (no siblings, no other children)
  - Returns linear path array, not tree structure

#### 2.3 Extend `user.service.ts`
- `getUserPath()`: Get exact path from user's entity to selected user
  - Entity path: from user's entity to selected user's entity
  - User path: from root user to selected user (via created_by chain)
  - Returns path arrays, not full trees

#### 2.4 Extend `profile.service.ts` and `role.service.ts`
- `getProfilePath()`: Get exact path from user's entity to profile
  - Entity path: from user's entity to profile's entity
  - User path: from logged-in user to profile creator (via created_by)
- `getRolePath()`: Get exact path from user's entity to role
  - Entity path: from user's entity to role's entity
  - User path: from logged-in user to role creator (via created_by)

#### 2.5 Extend `meter.service.ts`
- `getMeterPath()`: Get exact path from user's entity to meter
  - Entity path: from user's entity to meter's entity
  - User path: from logged-in user to meter creator (via created_by)
  - Then the meter itself

### Phase 3: Controller Layer

#### 3.1 Create `search.controller.ts`
- `globalSearch()`: Handle global search requests
- `getHierarchy()`: Handle hierarchy requests for any resource type
  - Route to appropriate service based on type

### Phase 4: Routes & Validation

#### 4.1 Create `search.routes.ts`
- `GET /api/search` → `globalSearch` controller
- `GET /api/search/:type/:id/hierarchy` → `getHierarchy` controller

#### 4.2 Create `search.validator.ts`
- Validate search query parameters
- Validate type parameter (enum: entity, user, profile, role)
- Validate pagination parameters

### Phase 5: Middleware

- `authenticate`: Verify JWT
- `requireReadPermission`: Check read permissions (may need multiple modules)
- `validateQuery`: Validate query parameters
- Entity access validation handled in service layer

---

## Database Queries

### Entity Path Query (Ancestors Only - No Siblings)
To get the exact path from user's entity to target entity:
```sql
-- Step 1: Get all ancestors of target entity (including itself)
WITH RECURSIVE target_ancestors AS (
  SELECT id, entity_id, name, email_id, 0 as depth FROM entities WHERE id = :targetEntityId
  UNION ALL
  SELECT e.id, e.entity_id, e.name, e.email_id, ta.depth + 1 
  FROM entities e
  INNER JOIN target_ancestors ta ON e.id = ta.entity_id
  WHERE e.id IS NOT NULL
)
SELECT * FROM target_ancestors ORDER BY depth DESC;
```

Then filter to only include entities from user's entity down to target (path only).

### User Path Query (Via created_by)
```sql
WITH RECURSIVE user_path AS (
  SELECT *, 0 as depth FROM users WHERE id = :targetUserId
  UNION ALL
  SELECT u.*, up.depth + 1 as depth FROM users u
  INNER JOIN user_path up ON u.id = up.created_by
  WHERE u.is_deleted = false AND u.id IS NOT NULL
)
SELECT * FROM user_path ORDER BY depth DESC;
```

### Search Queries
All search queries should:
- Use `ILIKE` for case-insensitive search
- Search across relevant fields (name, email, mobile_no, etc.)
- Filter by accessible entity IDs (except for root admin)
- Support pagination with `LIMIT` and `OFFSET`

---

## Search Fields by Resource Type

### Entities
- `name`
- `email_id`
- `mobile_no`

### Users
- `name`
- `email`
- `mobile_no`

### Profiles
- `name`

### Roles
- `name`

---

## Access Control Logic

### Entity Access
1. Get user's accessible entity IDs using `getAccessibleEntityIds(userEntityId)`
2. For root admin, don't filter by entity IDs
3. For entity admin, filter results to only accessible entities

### User Hierarchy Access
- Users can only see hierarchy of users within their accessible entities
- A user's hierarchy includes:
  - The user itself
  - All users created by this user (via `created_by`)
  - All users created by those users (recursive)

### Profile/Role Access
- Profiles and roles belong to entities
- Access is controlled by entity access
- Show entity hierarchy for the entity the profile/role belongs to

---

## Frontend Integration

### Search Flow
1. User types in topbar search field
2. Frontend calls `GET /api/search?q=<query>&page=1&limit=10`
3. Display results grouped by category:
   ```
   Entities (15)
   - KMP Energy
   - Ideal Energy
   ...
   
   Users (8)
   - John Doe
   - Jane Smith
   ...
   
   Profiles (3)
   - Tenant Profile
   ...
   
   Roles (5)
   - Admin Role
   ...
   ```
4. User clicks on a result
5. Frontend calls `GET /api/search/:type/:id/hierarchy`
6. Display hierarchy tree view

---

## File Structure

```
src/
├── controllers/
│   └── search.controller.ts          # NEW
├── services/
│   ├── search.service.ts             # NEW
│   ├── entity.service.ts             # EXTEND (add getEntityPath)
│   ├── user.service.ts                # EXTEND (add getUserPath)
│   ├── profile.service.ts             # EXTEND (add getProfilePath)
│   ├── role.service.ts                # EXTEND (add getRolePath)
│   └── meter.service.ts               # EXTEND (add getMeterPath, add to search)
├── repositories/
│   ├── search.repository.ts           # NEW (add searchMeters)
│   ├── entity.repository.ts           # EXTEND (add findEntityPath)
│   ├── user.repository.ts             # EXTEND (add findUserPath)
│   └── meter.repository.ts            # EXTEND (if needed for search)
├── routes/
│   └── search.routes.ts               # NEW
├── validators/
│   └── search.validator.ts            # NEW (add meter type)
└── types/
    └── search.ts                      # NEW (type definitions, add meter types)
```

---

## Testing Considerations

### Unit Tests
- Test search functionality for each resource type
- Test pagination
- Test filtering by type
- Test access control

### Integration Tests
- Test global search endpoint
- Test hierarchy endpoints for each resource type
- Test with different user roles (root admin, entity admin)

### Edge Cases
- Empty search query
- No results found
- Very long search queries
- Special characters in search query
- User with no accessible entities
- User hierarchy with no children
- Profile/Role with null entity_id

---

## Performance Considerations

1. **Indexing**: Ensure database indexes on:
   - `entities.name`, `entities.email_id`
   - `users.name`, `users.email`
   - `profiles.name`
   - `roles.name`
   - `users.created_by` (for hierarchy queries)
   - `users.entity_id` (for access control)

2. **Pagination**: Always use pagination to limit results

3. **Parallel Queries**: Run searches for different resource types in parallel

4. **Caching**: Consider caching frequent searches (optional, future enhancement)

---

## Future Enhancements

1. **Advanced Search**: Support for:
   - Field-specific search (`name:john`)
   - Boolean operators (`AND`, `OR`)
   - Date range filters

2. **Search Suggestions**: Autocomplete suggestions as user types

3. **Search History**: Store recent searches

4. **Full-text Search**: Use PostgreSQL full-text search for better relevance

5. **Search Analytics**: Track popular searches

---

## Migration Notes

- No database migrations required
- All functionality uses existing tables and relationships
- Backward compatible with existing APIs

---

## Success Criteria

✅ Search across all resource types (Entities, Users, Profiles, Roles)
✅ Category-wise grouped results
✅ Pagination support
✅ Hierarchy support for all resource types
✅ Access control enforced
✅ Single unified API endpoint
✅ Type filtering support
✅ Performance optimized with proper indexing

