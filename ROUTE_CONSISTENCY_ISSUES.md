# 🔄 Route Consistency Issues

## Current Route Patterns Analysis

### Listing Endpoints (Inconsistent!)

| Resource | List Route | Entity Filter Method | Pattern |
|----------|-----------|---------------------|---------|
| **Entities** | `GET /api/entities` | Query param: `?entityId=xxx` | ✅ Query param |
| **Users** | `GET /api/users/entity/:entityId` | Path param: `/entity/:entityId` | ❌ Path param |
| **Roles** | `GET /api/roles` | Query param: `?entityId=xxx` | ✅ Query param |
| **Profiles** | `GET /api/profiles` | Query param: `?entityId=xxx` | ✅ Query param |
| **Modules** | `GET /api/modules` | None (global only) | ✅ OK |
| **Meters** | `GET /api/meters/entity/:entityId` | Path param: `/entity/:entityId` | ❌ Path param |

### Issues Found:

1. **Inconsistent Entity Filtering**:
   - Users and Meters use path params: `/entity/:entityId`
   - Entities, Roles, Profiles use query params: `?entityId=xxx`
   - This creates confusion and inconsistency

2. **Route Order Issues**:
   - Users: `/:id` comes before `/entity/:entityId` - OK
   - Meters: `/:id` comes before `/entity/:entityId` - OK
   - Roles: `/` comes before `/:id` - OK
   - But if we change to query params, we need to ensure `/` comes before `/:id`

3. **Missing List Routes**:
   - Users: No `GET /api/users` (only `/entity/:entityId`)
   - Meters: No `GET /api/meters` (only `/entity/:entityId`)

## Recommended Standard Pattern

**All resources should follow this pattern:**

```
GET /api/{resource}              - List all (with optional ?entityId=xxx query param)
GET /api/{resource}/:id          - Get by ID
POST /api/{resource}             - Create
PATCH /api/{resource}/:id        - Update
DELETE /api/{resource}/:id       - Delete
```

**Special cases:**
- Entities: `GET /api/entities/:id/hierarchy` - Get hierarchy tree
- Users: `POST /api/users/change-password` - Change password

## Required Changes

### 1. User Routes - Change to Query Param Pattern
- ❌ Current: `GET /api/users/entity/:entityId`
- ✅ New: `GET /api/users?entityId=xxx`
- **Impact**: Need to update controller to read from query instead of params

### 2. Meter Routes - Change to Query Param Pattern
- ❌ Current: `GET /api/meters/entity/:entityId`
- ✅ New: `GET /api/meters?entityId=xxx`
- **Impact**: Need to update controller to read from query instead of params

### 3. Ensure Route Order
- All `GET /` routes must come before `GET /:id` routes
- This is already correct for most routes

## Benefits of Standardization

1. **Consistency**: All resources follow the same pattern
2. **RESTful**: Query params for filtering is more RESTful
3. **Flexibility**: Can add more query params easily (page, limit, etc.)
4. **Maintainability**: Easier to understand and maintain

