# 🔍 Global Search API - Design Document

## Overview

A unified global search API that allows searching across **Entities**, **Users**, **Profiles**, and **Roles** with category-wise results and hierarchy support. This API will power the topbar search functionality in the frontend.

---

## Requirements

### 1. Search Functionality
- Search across multiple resource types: Entities, Users, Profiles, Roles
- Category-wise grouping of results
- Pagination support
- Filter by resource type (optional)
- Respect entity access control (users can only see accessible entities)

### 2. Hierarchy Support
- After selecting a result, show its complete hierarchy
- **Entities**: Already have `getHierarchy()` method ✅
- **Users**: Need to implement `getUserHierarchy()` (via `created_by` relationship)
- **Profiles**: Check if hierarchy exists (via `entity_id` - profiles belong to entities)
- **Roles**: Check if hierarchy exists (via `entity_id` - roles belong to entities)

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
- `type`: Resource type (`entity`, `user`, `profile`, `role`)
- `id`: Resource ID (UUID)

#### Query Parameters
- `depth` (optional): Maximum depth levels (default: unlimited)
- `page` (optional): Page number (for paginated root children)
- `limit` (optional): Items per page (for paginated root children)
- `paginateRootChildren` (optional): Enable pagination for root's direct children (boolean)

#### Response Structure

**For Entities** (existing functionality):
```json
{
  "success": true,
  "message": "Entity hierarchy retrieved",
  "data": {
    "id": "entity-uuid",
    "name": "KMP Energy",
    "children": [
      {
        "id": "child-uuid",
        "name": "Ideal Energy",
        "children": [...]
      }
    ]
  }
}
```

**For Users** (new functionality):
```json
{
  "success": true,
  "message": "User hierarchy retrieved",
  "data": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "entity": {
      "id": "entity-uuid",
      "name": "KMP Energy"
    },
    "children": [
      {
        "id": "child-user-uuid",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "children": [...]
      }
    ]
  }
}
```

**For Profiles** (entity-based hierarchy):
```json
{
  "success": true,
  "message": "Profile hierarchy retrieved",
  "data": {
    "id": "profile-uuid",
    "name": "Tenant Profile",
    "entity": {
      "id": "entity-uuid",
      "name": "KMP Energy",
      "children": [...]
    }
  }
}
```

**For Roles** (entity-based hierarchy):
```json
{
  "success": true,
  "message": "Role hierarchy retrieved",
  "data": {
    "id": "role-uuid",
    "name": "Admin Role",
    "entity": {
      "id": "entity-uuid",
      "name": "KMP Energy",
      "children": [...]
    }
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
  - Groups results by category
  - Returns paginated, categorized results

#### 2.2 Extend `user.service.ts`
- `getUserHierarchy()`: Build user hierarchy tree
  - Similar to `getEntityHierarchy()` in entity service
  - Build tree from flat array of users

#### 2.3 Extend `profile.service.ts` and `role.service.ts`
- `getProfileHierarchy()`: Get profile with entity hierarchy
- `getRoleHierarchy()`: Get role with entity hierarchy

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

### User Hierarchy Query (Recursive CTE)
```sql
WITH RECURSIVE user_tree AS (
  SELECT *, 0 as depth FROM users WHERE id = :userId
  UNION ALL
  SELECT u.*, ut.depth + 1 as depth FROM users u
  INNER JOIN user_tree ut ON u.created_by = ut.id
  WHERE u.is_deleted = false AND ut.depth + 1 <= COALESCE(:maxDepth, 999)
)
SELECT * FROM user_tree ORDER BY depth, creation_time;
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
│   ├── user.service.ts                # EXTEND (add getUserHierarchy)
│   ├── profile.service.ts             # EXTEND (add getProfileHierarchy)
│   └── role.service.ts                # EXTEND (add getRoleHierarchy)
├── repositories/
│   ├── search.repository.ts           # NEW
│   ├── user.repository.ts             # EXTEND (add findUserHierarchy)
│   ├── profile.repository.ts          # EXTEND (add findWithEntityHierarchy)
│   └── role.repository.ts             # EXTEND (add findWithEntityHierarchy)
├── routes/
│   └── search.routes.ts               # NEW
├── validators/
│   └── search.validator.ts            # NEW
└── types/
    └── search.ts                      # NEW (type definitions)
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

