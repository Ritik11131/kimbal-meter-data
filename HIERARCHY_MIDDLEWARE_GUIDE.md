# 🌳 Hierarchy Middleware Guide

## Overview

The `hierarchy.ts` middleware implements **Entity Hierarchy Access Control** for the Smart Meter System. It ensures users can only access entities and resources within their hierarchical scope (their own entity and all descendant entities).

---

## 📁 File Location

**`src/middleware/hierarchy.ts`**

---

## 🎯 Purpose

The hierarchy middleware:
1. **Validates entity access** (ensures user can access target entity)
2. **Enforces hierarchical isolation** (prevents cross-tenant/cross-branch access)
3. **Validates parent entities** (ensures child entities are created under accessible parents)
4. **Validates resource ownership** (ensures resources belong to accessible entities)
5. **Handles global resources** (special handling for global roles/profiles)

---

## 🏗️ Entity Hierarchy Structure

```
┌─────────────────────────────────────────┐
│ ROOT: ETL Admin                        │
│ entity_id: null                        │
└──────────────┬─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ TENANT: KMP Energy                      │
│ entity_id: <root-id>                    │
└──────────────┬─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ CUSTOMER: Ideal Energy                  │
│ entity_id: <tenant-id>                  │
└──────────────┬─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ CONSUMER: Patanjali Industries          │
│ entity_id: <customer-id>                │
└─────────────────────────────────────────┘
```

**Access Rules:**
- ✅ Users can access their own entity
- ✅ Users can access all descendant entities (children, grandchildren, etc.)
- ❌ Users cannot access parent entities
- ❌ Users cannot access sibling entities (different branches)

---

## 🔧 Functions

### 1. `enforceEntityAccess(entityIdParam?: string)`

**Purpose:** Validates entity access when entity ID is in URL params or request body

**What it checks:**
- User must be authenticated (`req.user` exists)
- Target entity ID must be accessible from user's entity hierarchy
- Looks for entity ID in: `req.params[entityIdParam]`, `req.body.entityId`, or `req.body.entity_id`

**Parameters:**
- `entityIdParam` (optional, default: `"id"`) - Name of the param containing entity ID

**Usage:**
- `GET /api/entities/:id` - Get entity by ID
- `PATCH /api/entities/:id` - Update entity
- `DELETE /api/entities/:id` - Delete entity
- `GET /api/entities/:id/hierarchy` - Get entity hierarchy

**Example:**
```typescript
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  enforceEntityAccess(),  // ✅ Validates entity ID in :id param
  entityController.getById
)
```

**Flow:**
```
1. Extract entity ID from req.params.id or req.body
2. Get user's entityId from req.user.entityId
3. Call validateEntityAccess(userEntityId, targetEntityId)
4. If accessible → next()
5. If not accessible → 403 Forbidden
```

---

### 2. `enforceEntityAccessQuery(paramName?: string)`

**Purpose:** Validates entity access when entity ID is in query parameters or request body

**What it checks:**
- User must be authenticated (`req.user` exists)
- Target entity ID must be accessible from user's entity hierarchy
- Looks for entity ID in: `req.query[paramName]`, `req.body[paramName]`, or `req.body[paramName.toLowerCase()]`

**Parameters:**
- `paramName` (optional, default: `"entityId"`) - Name of the query/body parameter

**Usage:**
- `POST /api/users?entity_id=xxx` - Create user for specific entity
- `POST /api/roles?entityId=xxx` - Create role for specific entity
- `POST /api/profiles?entity_id=xxx` - Create profile for specific entity
- `POST /api/meters` with `body.entityId` - Create meter for specific entity

**Example:**
```typescript
router.post("/", 
  authenticate, 
  authorize([MODULES.USER]), 
  enforceEntityAccessQuery("entity_id"),  // ✅ Validates entity_id in query/body
  validate(createUserSchema),
  userController.create
)
```

**Flow:**
```
1. Extract entity ID from req.query.entity_id or req.body.entity_id
2. Get user's entityId from req.user.entityId
3. Call validateEntityAccess(userEntityId, targetEntityId)
4. If accessible → next()
5. If not accessible → 403 Forbidden
```

---

### 3. `validateParentEntityAccess()`

**Purpose:** Validates that parent entity is accessible when creating child entities

**What it checks:**
- User must be authenticated (`req.user` exists)
- Parent entity ID (from `req.body.entity_id` or `req.body.entityId`) must be accessible
- If no parent entity (creating root), allows request to proceed

**Usage:**
- `POST /api/entities` - Create entity (validates parent entity access)

**Example:**
```typescript
router.post("/", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  validateParentEntityAccess(),  // ✅ Validates parent entity in body
  validate(createEntitySchema),
  entityController.create
)
```

**Flow:**
```
1. Extract parent entity ID from req.body.entity_id or req.body.entityId
2. If no parent (null/undefined) → next() (creating root entity)
3. Get user's entityId from req.user.entityId
4. Call validateEntityAccess(userEntityId, parentEntityId)
5. If accessible → next()
6. If not accessible → 403 Forbidden
```

**Special Case:**
- ✅ Creating root entity (parent = null) → Always allowed (if user has permission)

---

### 4. `enforceResourceEntityAccess(resourceType, idParam?: string)`

**Purpose:** Validates entity access for resources where the ID is NOT the entity ID (users, roles, profiles, meters)

**What it checks:**
- User must be authenticated (`req.user` exists)
- Fetches the resource by ID
- Extracts `entity_id` from the resource
- Validates that the resource's entity is accessible
- Handles special cases (global roles/profiles)

**Parameters:**
- `resourceType` - Type of resource: `"user" | "role" | "profile" | "meter"`
- `idParam` (optional, default: `"id"`) - Name of the param containing resource ID

**Usage:**
- `GET /api/users/:id` - Get user (validates user's entity)
- `PATCH /api/users/:id` - Update user (validates user's entity)
- `DELETE /api/users/:id` - Delete user (validates user's entity)
- `GET /api/roles/:id` - Get role (validates role's entity)
- `GET /api/profiles/:id` - Get profile (validates profile's entity)
- `GET /api/meters/:id` - Get meter (validates meter's entity)

**Example:**
```typescript
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.USER]), 
  enforceResourceEntityAccess("user"),  // ✅ Fetches user, validates user.entity_id
  userController.getById
)
```

**Flow:**
```
1. Extract resource ID from req.params.id
2. Fetch resource from database based on resourceType
3. If resource not found → 404 Not Found
4. Extract entity_id from resource
5. Handle special cases (global roles/profiles)
6. Call validateEntityAccess(userEntityId, resource.entity_id)
7. If accessible → next()
8. If not accessible → 403 Forbidden
```

**Special Cases:**

#### Global Roles (`entity_id = null`)
```typescript
if (resource.entity_id === null) {
  return next()  // ✅ Global roles accessible to all authenticated users
}
```

#### Global Profiles (`entity_id = null`)
```typescript
if (resource.entity_id === null) {
  // ✅ Only root admin can access global profiles
  const entity = await Entity.findByPk(user.entityId)
  if (!entity || entity.entity_id !== null) {
    throw new AppError("Only root admin can access global profiles", 403)
  }
  return next()
}
```

---

### 5. `getHierarchyScope(userEntityId: string)`

**Purpose:** Helper function to get hierarchy-scoped where clause for Sequelize queries

**What it does:**
- Gets all accessible entity IDs for a user
- Returns a Sequelize where condition to filter queries

**Usage:**
- Used in repositories/services to filter queries by accessible entities

**Example:**
```typescript
const scope = await getHierarchyScope(user.entityId)
// Returns: { id: ["entity-1", "entity-2", "entity-3"] }

const entities = await Entity.findAll({
  where: {
    ...scope,  // Only entities accessible by user
    // ... other conditions
  }
})
```

---

## 🔄 How It Works

### Step-by-Step Flow

```
1. Request arrives at route
   ↓
2. authenticate() middleware runs
   - Verifies JWT token
   - Extracts user info (including entityId)
   - Attaches to req.user
   ↓
3. authorize() or authorizeRead() middleware runs
   - Checks module permissions
   ↓
4. Hierarchy middleware runs (one of):
   - enforceEntityAccess() - For entity IDs in params
   - enforceEntityAccessQuery() - For entity IDs in query/body
   - validateParentEntityAccess() - For parent entity validation
   - enforceResourceEntityAccess() - For resource entity validation
   ↓
5. Calls validateEntityAccess() utility
   - Uses canAccessEntity() to check hierarchy
   - Uses recursive CTE query to find descendants
   ↓
6. If accessible:
   - next() is called
   - Request proceeds to controller
   ↓
7. If not accessible:
   - Throws AppError with 403 Forbidden
   - Request is blocked
```

---

## 📝 Real-World Examples

### Example 1: Getting Entity by ID

**Route:**
```typescript
router.get("/:id", 
  authenticate,                    // ✅ Step 1: Verify JWT token
  authorizeRead([MODULES.ENTITY]), // ✅ Step 2: Check read permission
  enforceEntityAccess(),           // ✅ Step 3: Validate entity access
  entityController.getById        // ✅ Step 4: Execute controller
)
```

**Request:**
```http
GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435
Authorization: Bearer <token>
```

**User Context:**
- User's entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (KMP Energy - Tenant)
- Target entity: `5564b446-5b2a-4a2b-becc-d0cef79d2435` (Ideal Energy - Customer)

**Validation:**
```
1. Extract entity ID from req.params.id
2. Check if Ideal Energy is descendant of KMP Energy
3. ✅ Yes - KMP Energy → Ideal Energy (parent-child relationship)
4. ✅ Access granted
```

**Result:** ✅ Request proceeds

---

### Example 2: Creating User for Entity

**Route:**
```typescript
router.post("/", 
  authenticate,                    // ✅ Step 1: Verify JWT token
  authorize([MODULES.USER]),      // ✅ Step 2: Check write permission
  enforceEntityAccessQuery("entity_id"), // ✅ Step 3: Validate entity access
  validate(createUserSchema),     // ✅ Step 4: Validate body
  userController.create           // ✅ Step 5: Execute controller
)
```

**Request:**
```http
POST /api/users?entity_id=5564b446-5b2a-4a2b-becc-d0cef79d2435
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@idealenergy.co",
  "name": "New User",
  "password": "Password123!",
  "mobile_no": "1234567890",
  "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",
  "role_id": "role-uuid"
}
```

**User Context:**
- User's entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (KMP Energy - Tenant)
- Target entity: `5564b446-5b2a-4a2b-becc-d0cef79d2435` (Ideal Energy - Customer)

**Validation:**
```
1. Extract entity_id from req.query.entity_id or req.body.entity_id
2. Check if Ideal Energy is accessible from KMP Energy
3. ✅ Yes - KMP Energy → Ideal Energy (parent-child)
4. ✅ Access granted
```

**Result:** ✅ Request proceeds

---

### Example 3: Attempting to Access Sibling Entity

**Request:**
```http
GET /api/entities/94ae4566-7f8b-4a2d-a911-4ee2e5f16993
Authorization: Bearer <token>
```

**User Context:**
- User's entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (KMP Energy - Tenant)
- Target entity: `94ae4566-7f8b-4a2d-a911-4ee2e5f16993` (Different Tenant - Sibling)

**Validation:**
```
1. Extract entity ID from req.params.id
2. Check if target entity is accessible from KMP Energy
3. ❌ No - Different branch (sibling entities)
4. ❌ Access denied
```

**Result:** ❌ **403 Forbidden** - "You cannot access entity 94ae4566-7f8b-4a2d-a911-4ee2e5f16993 as it is outside your hierarchy"

---

### Example 4: Getting User by ID

**Route:**
```typescript
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.USER]), 
  enforceResourceEntityAccess("user"),  // ✅ Fetches user, validates user.entity_id
  userController.getById
)
```

**Request:**
```http
GET /api/users/user-123
Authorization: Bearer <token>
```

**User Context:**
- User's entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (KMP Energy - Tenant)
- Target user ID: `user-123`

**Validation:**
```
1. Extract user ID from req.params.id
2. Fetch user from database: User.findById("user-123")
3. Extract user.entity_id from fetched user
4. Check if user.entity_id is accessible from KMP Energy
5. ✅ Yes - User belongs to accessible entity
6. ✅ Access granted
```

**Result:** ✅ Request proceeds

---

### Example 5: Creating Entity with Parent Validation

**Route:**
```typescript
router.post("/", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  validateParentEntityAccess(),  // ✅ Validates parent entity
  validate(createEntitySchema),
  entityController.create
)
```

**Request:**
```http
POST /api/entities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Customer",
  "email_id": "new@customer.com",
  "mobile_no": "1234567890",
  "profile_id": "profile-uuid",
  "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"  // Parent entity
}
```

**User Context:**
- User's entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (KMP Energy - Tenant)
- Parent entity: `6648975a-d7ce-41bd-aeb6-47e905b5232f` (Same as user's entity)

**Validation:**
```
1. Extract parent entity_id from req.body.entity_id
2. Check if parent entity is accessible from user's entity
3. ✅ Yes - Same entity (user can create children under their own entity)
4. ✅ Access granted
```

**Result:** ✅ Request proceeds

---

### Example 6: Accessing Global Profile

**Route:**
```typescript
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.PROFILE]), 
  enforceResourceEntityAccess("profile"),  // ✅ Special handling for global profiles
  profileController.getById
)
```

**Request:**
```http
GET /api/profiles/admin-profile-uuid
Authorization: Bearer <token>
```

**User Context:**
- User's entity: `d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca` (ETL Admin - Root)
- Target profile ID: `admin-profile-uuid` (Global profile, entity_id = null)

**Validation:**
```
1. Extract profile ID from req.params.id
2. Fetch profile from database
3. Check if profile.entity_id === null (global profile)
4. ✅ Yes - Global profile
5. Check if user is root admin (entity.entity_id === null)
6. ✅ Yes - User is root admin
7. ✅ Access granted
```

**Result:** ✅ Request proceeds

**If Non-Root User Tries:**
```
1. Extract profile ID from req.params.id
2. Fetch profile from database
3. Check if profile.entity_id === null (global profile)
4. ✅ Yes - Global profile
5. Check if user is root admin
6. ❌ No - User is not root admin
7. ❌ Access denied
```

**Result:** ❌ **403 Forbidden** - "Only root admin can access global profiles"

---

## 🔗 Integration with Other Middleware

The hierarchy middleware works in sequence with other middleware:

### Typical Route Middleware Chain

```typescript
router.get("/api/entities/:id",
  authenticate,                    // 1. Verify JWT token (sets req.user)
  authorizeRead([MODULES.ENTITY]), // 2. Check module permissions
  enforceEntityAccess(),           // 3. Validate entity hierarchy access
  entityController.getById         // 4. Execute business logic
)
```

### Middleware Order Matters!

1. **`authenticate`** - Must run first (sets `req.user` with `entityId`)
2. **`authorize`/`authorizeRead`** - Checks module permissions
3. **Hierarchy middleware** - Validates entity access (requires `req.user.entityId`)
4. **`validate`** - Validates request body/params
5. **Controller** - Executes business logic

---

## 🚨 Error Handling

### Error Types

| Error | Status Code | When It Occurs |
|-------|------------|----------------|
| `UNAUTHORIZED` | 401 | `req.user` is missing (not authenticated) |
| `NOT_FOUND` | 404 | Resource not found (for `enforceResourceEntityAccess`) |
| `FORBIDDEN` | 403 | Entity/resource is outside user's hierarchy |
| Custom Message | 403 | Specific error (e.g., "Only root admin can access global profiles") |

### Error Response Format

```json
{
  "success": false,
  "error": "You cannot access entity 94ae4566-7f8b-4a2d-a911-4ee2e5f16993 as it is outside your hierarchy",
  "timestamp": 1762498878440,
  "path": "/api/entities/94ae4566-7f8b-4a2d-a911-4ee2e5f16993"
}
```

---

## 📋 Complete Route Examples

### Entity Routes

```typescript
// List entities (no hierarchy check - handled in service)
router.get("/", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  entityController.list
)

// Get entity by ID (validates entity access)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  validateUUIDParams(["id"]),
  enforceEntityAccess(),  // ✅ Validates entity ID in :id param
  entityController.getById
)

// Create entity (validates parent entity access)
router.post("/", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  validateParentEntityAccess(),  // ✅ Validates parent entity in body
  validate(createEntitySchema),
  entityController.create
)

// Update entity (validates entity access)
router.patch("/:id", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  validateUUIDParams(["id"]),
  enforceEntityAccess(),  // ✅ Validates entity ID in :id param
  validate(updateEntitySchema),
  entityController.update
)

// Delete entity (validates entity access)
router.delete("/:id", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  validateUUIDParams(["id"]),
  enforceEntityAccess(),  // ✅ Validates entity ID in :id param
  entityController.remove
)
```

### User Routes

```typescript
// List users (no hierarchy check - handled in service)
router.get("/", 
  authenticate, 
  authorizeRead([MODULES.USER]), 
  userController.list
)

// Get user by ID (validates user's entity)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.USER]), 
  validateUUIDParams(["id"]),
  enforceResourceEntityAccess("user"),  // ✅ Fetches user, validates user.entity_id
  userController.getById
)

// Create user (validates target entity)
router.post("/", 
  authenticate, 
  authorize([MODULES.USER]), 
  enforceEntityAccessQuery("entity_id"),  // ✅ Validates entity_id in query/body
  validate(createUserSchema),
  userController.create
)
```

### Role Routes

```typescript
// Get role by ID (validates role's entity, handles global roles)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.ROLE]), 
  validateUUIDParams(["id"]),
  enforceResourceEntityAccess("role"),  // ✅ Fetches role, validates role.entity_id (or allows global)
  roleController.getById
)

// Create role (validates target entity)
router.post("/", 
  authenticate, 
  authorize([MODULES.ROLE]), 
  enforceEntityAccessQuery("entityId"),  // ✅ Validates entityId in query/body
  validate(createRoleSchema),
  roleController.create
)
```

### Profile Routes

```typescript
// Get profile by ID (validates profile's entity, handles global profiles)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.PROFILE]), 
  validateUUIDParams(["id"]),
  enforceResourceEntityAccess("profile"),  // ✅ Fetches profile, validates profile.entity_id (or checks root admin for global)
  profileController.getById
)

// Create profile (validates target entity)
router.post("/", 
  authenticate, 
  authorize([MODULES.PROFILE]), 
  enforceEntityAccessQuery("entity_id"),  // ✅ Validates entity_id in query/body
  validate(createProfileSchema),
  profileController.create
)
```

### Meter Routes

```typescript
// Get meter by ID (validates meter's entity)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  validateUUIDParams(["id"]),
  enforceResourceEntityAccess("meter"),  // ✅ Fetches meter, validates meter.entity_id
  meterController.getById
)

// Create meter (validates target entity)
router.post("/", 
  authenticate, 
  authorize([MODULES.ENTITY]), 
  enforceEntityAccessQuery("entityId"),  // ✅ Validates entityId in query/body
  validate(createMeterSchema),
  meterController.create
)
```

---

## 🔍 Key Differences: Function Comparison

| Function | Used For | Entity ID Source | Special Cases |
|----------|---------|------------------|---------------|
| `enforceEntityAccess()` | Entity operations | `req.params.id` or `req.body` | None |
| `enforceEntityAccessQuery()` | Creating resources | `req.query` or `req.body` | None |
| `validateParentEntityAccess()` | Creating entities | `req.body.entity_id` | Allows null (root entity) |
| `enforceResourceEntityAccess()` | Resource operations | Fetches from DB | Global roles/profiles |

---

## 💡 Best Practices

1. **Always use `authenticate` first** - Hierarchy middleware requires `req.user.entityId`
2. **Use appropriate function** - Match the function to your use case
3. **Combine with authorization** - Authorization checks permissions, hierarchy checks entity access
4. **Handle global resources** - Be aware of special cases (global roles/profiles)
5. **Validate UUIDs first** - Use `validateUUIDParams` before hierarchy checks

---

## 🎯 Summary

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `enforceEntityAccess()` | Validate entity ID in params | GET/PATCH/DELETE `/api/entities/:id` |
| `enforceEntityAccessQuery()` | Validate entity ID in query/body | POST with `?entityId=xxx` or `body.entityId` |
| `validateParentEntityAccess()` | Validate parent entity | POST `/api/entities` (creating child) |
| `enforceResourceEntityAccess()` | Validate resource's entity | GET/PATCH/DELETE resources (users, roles, profiles, meters) |
| `getHierarchyScope()` | Get query filter | Filtering queries by accessible entities |

**The hierarchy middleware is a critical security layer that ensures users can only access entities and resources within their hierarchical scope, preventing cross-tenant and unauthorized access.**

