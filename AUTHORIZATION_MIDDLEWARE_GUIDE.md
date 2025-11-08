# 🔐 Authorization Middleware Guide

## Overview

The `authorization.ts` middleware implements **Role-Based Access Control (RBAC)** for the Smart Meter System. It checks if a user has the required permissions to access specific modules (Entity, User, Role, Profile, Module, Meter) before allowing the request to proceed.

---

## 📁 File Location

**`src/middleware/authorization.ts`**

---

## 🎯 Purpose

The authorization middleware:
1. **Validates user authentication** (ensures `req.user` exists)
2. **Checks module permissions** (verifies user has access to required modules)
3. **Enforces read/write permissions** (distinguishes between read-only and write operations)
4. **Throws appropriate errors** (401 Unauthorized or 403 Forbidden)

---

## 🔧 Functions

### 1. `authorize(modules: string[])`

**Purpose:** Middleware for **write operations** (POST, PATCH, DELETE)

**What it checks:**
- User must be authenticated (`req.user` exists)
- User must have **write permission** for at least one of the specified modules

**Logic:**
```typescript
const hasPermission = modules.some((module) => {
  const permission = req.user!.permissions.find((p) => p.name === module)
  return permission && permission.write  // ✅ Requires WRITE permission
})
```

**Usage:**
- `POST /api/entities` - Create entity
- `PATCH /api/users/:id` - Update user
- `DELETE /api/roles/:id` - Delete role
- `POST /api/meters` - Create meter

**Example:**
```typescript
router.post("/", authenticate, authorize([MODULES.ENTITY]), ...)
// ✅ User needs WRITE permission for "Entity" module
```

**Error Response:**
- **401 Unauthorized** - If `req.user` is missing
- **403 Forbidden** - If user doesn't have write permission for any specified module

---

### 2. `authorizeRead(modules: string[])`

**Purpose:** Middleware for **read operations** (GET)

**What it checks:**
- User must be authenticated (`req.user` exists)
- User must have **read OR write permission** for at least one of the specified modules

**Logic:**
```typescript
const hasPermission = modules.some((module) => {
  const permission = req.user!.permissions.find((p) => p.name === module)
  return permission && (permission.read || permission.write)  // ✅ Read OR Write
})
```

**Usage:**
- `GET /api/entities` - List entities
- `GET /api/users/:id` - Get user by ID
- `GET /api/roles` - List roles
- `GET /api/meters` - List meters

**Example:**
```typescript
router.get("/", authenticate, authorizeRead([MODULES.USER]), ...)
// ✅ User needs READ or WRITE permission for "User" module
```

**Error Response:**
- **401 Unauthorized** - If `req.user` is missing
- **403 Forbidden** - If user doesn't have read or write permission for any specified module

---

## 📊 Permission Structure

### PermissionSet Interface

```typescript
interface PermissionSet {
  moduleId: string      // UUID of the module
  name: string          // Module name: "Entity", "User", "Role", etc.
  read: boolean         // Can read this module
  write: boolean        // Can write (create/update/delete) this module
}
```

### Available Modules

```typescript
MODULES = {
  ENTITY: "Entity",     // Entity management
  USER: "User",         // User management
  ROLE: "Role",         // Role management
  PROFILE: "Profile",   // Profile management
  MODULE: "Module",     // Module management (system-wide)
  METER: "Meter"       // Meter management
}
```

---

## 🔄 How It Works

### Step-by-Step Flow

```
1. Request arrives at route
   ↓
2. authenticate() middleware runs
   - Verifies JWT token
   - Extracts user info and permissions
   - Attaches to req.user
   ↓
3. authorize() or authorizeRead() middleware runs
   - Checks if req.user exists
   - Looks up permissions for specified modules
   - Validates read/write access
   ↓
4. If authorized:
   - next() is called
   - Request proceeds to controller
   ↓
5. If not authorized:
   - Throws AppError with 401/403
   - Request is blocked
```

---

## 📝 Real-World Examples

### Example 1: Creating an Entity

**Route:**
```typescript
router.post("/", 
  authenticate,                    // ✅ Step 1: Verify JWT token
  authorize([MODULES.ENTITY]),     // ✅ Step 2: Check write permission for "Entity"
  validate(createEntitySchema),    // ✅ Step 3: Validate request body
  entityController.create          // ✅ Step 4: Execute controller
)
```

**User Permissions:**
```json
{
  "permissions": [
    {
      "moduleId": "d3f32d83-c2f9-4336-b570-38535d026e83",
      "name": "Entity",
      "read": true,
      "write": true  // ✅ Has write permission - ALLOWED
    }
  ]
}
```

**Result:** ✅ Request proceeds

---

### Example 2: Listing Users (Read-Only)

**Route:**
```typescript
router.get("/", 
  authenticate,                    // ✅ Step 1: Verify JWT token
  authorizeRead([MODULES.USER]),   // ✅ Step 2: Check read permission for "User"
  userController.list              // ✅ Step 3: Execute controller
)
```

**User Permissions:**
```json
{
  "permissions": [
    {
      "moduleId": "30e0af16-d582-4003-95e6-ebeb0dd756e9",
      "name": "User",
      "read": true,   // ✅ Has read permission - ALLOWED
      "write": false
    }
  ]
}
```

**Result:** ✅ Request proceeds (read permission is sufficient)

---

### Example 3: Attempting to Delete Without Permission

**Route:**
```typescript
router.delete("/:id", 
  authenticate,                    // ✅ Step 1: Verify JWT token
  authorize([MODULES.ROLE]),       // ❌ Step 2: Check write permission for "Role"
  roleController.remove            // ❌ Step 3: Never reached
)
```

**User Permissions:**
```json
{
  "permissions": [
    {
      "moduleId": "4a3ce07e-c028-4801-827b-15a62a190f45",
      "name": "Role",
      "read": true,
      "write": false  // ❌ No write permission - BLOCKED
    }
  ]
}
```

**Result:** ❌ **403 Forbidden** - "You do not have permission to perform this action"

---

## 🎭 Multiple Modules Example

You can specify multiple modules. The user needs permission for **at least one**:

```typescript
router.get("/", 
  authenticate,
  authorizeRead([MODULES.ENTITY, MODULES.USER]),  // ✅ Needs permission for Entity OR User
  ...
)
```

**Logic:** Uses `Array.some()` - returns `true` if **any** module has permission

---

## 🔗 Integration with Other Middleware

The authorization middleware works in sequence with other middleware:

### Typical Route Middleware Chain

```typescript
router.post("/api/entities",
  authenticate,                    // 1. Verify JWT token
  authorize([MODULES.ENTITY]),     // 2. Check write permission
  validateParentEntityAccess(),    // 3. Validate entity hierarchy access
  validate(createEntitySchema),    // 4. Validate request body
  entityController.create          // 5. Execute business logic
)
```

### Middleware Order Matters!

1. **`authenticate`** - Must run first (sets `req.user`)
2. **`authorize`/`authorizeRead`** - Runs after authentication
3. **`validateParentEntityAccess`** - Runs after authorization (hierarchy check)
4. **`validate`** - Validates request body/params
5. **Controller** - Executes business logic

---

## 🚨 Error Handling

### Error Types

| Error | Status Code | When It Occurs |
|-------|------------|----------------|
| `UNAUTHORIZED` | 401 | `req.user` is missing (not authenticated) |
| `PERMISSION_DENIED` | 403 | User doesn't have required permissions |

### Error Response Format

```json
{
  "success": false,
  "error": "You do not have permission to perform this action",
  "timestamp": 1762498878440,
  "path": "/api/entities"
}
```

---

## 📋 Complete Route Examples

### Entity Routes

```typescript
// List entities (read)
router.get("/", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  entityController.list
)

// Get entity by ID (read)
router.get("/:id", 
  authenticate, 
  authorizeRead([MODULES.ENTITY]), 
  validateUUIDParams(["id"]),
  enforceEntityAccess(),
  entityController.getById
)

// Create entity (write)
router.post("/", 
  authenticate, 
  authorize([MODULES.ENTITY]),  // ✅ Requires WRITE
  validateParentEntityAccess(),
  validate(createEntitySchema),
  entityController.create
)

// Update entity (write)
router.patch("/:id", 
  authenticate, 
  authorize([MODULES.ENTITY]),  // ✅ Requires WRITE
  validateUUIDParams(["id"]),
  enforceEntityAccess(),
  validate(updateEntitySchema),
  entityController.update
)

// Delete entity (write)
router.delete("/:id", 
  authenticate, 
  authorize([MODULES.ENTITY]),  // ✅ Requires WRITE
  validateUUIDParams(["id"]),
  enforceEntityAccess(),
  entityController.remove
)
```

### User Routes

```typescript
// List users (read)
router.get("/", 
  authenticate, 
  authorizeRead([MODULES.USER]), 
  userController.list
)

// Create user (write)
router.post("/", 
  authenticate, 
  authorize([MODULES.USER]),  // ✅ Requires WRITE
  enforceEntityAccessQuery("entity_id"),
  validate(createUserSchema),
  userController.create
)
```

### Role Routes

```typescript
// List roles (read)
router.get("/", 
  authenticate, 
  authorizeRead([MODULES.ROLE]), 
  roleController.listByEntity
)

// Create role (write)
router.post("/", 
  authenticate, 
  authorize([MODULES.ROLE]),  // ✅ Requires WRITE
  enforceEntityAccessQuery("entityId"),
  validate(createRoleSchema),
  roleController.create
)
```

---

## 🔍 Key Differences: `authorize` vs `authorizeRead`

| Feature | `authorize()` | `authorizeRead()` |
|---------|---------------|-------------------|
| **Used for** | Write operations (POST, PATCH, DELETE) | Read operations (GET) |
| **Requires** | `write: true` | `read: true` OR `write: true` |
| **Stricter** | ✅ Yes (write only) | ❌ No (read or write) |
| **Example** | Creating/updating/deleting resources | Viewing/listing resources |

---

## 💡 Best Practices

1. **Always use `authenticate` first** - Authorization requires authentication
2. **Use `authorizeRead` for GET requests** - Allows read-only users
3. **Use `authorize` for write operations** - Stricter check for modifications
4. **Specify correct modules** - Match the resource being accessed
5. **Combine with hierarchy middleware** - Authorization checks permissions, hierarchy checks entity access

---

## 🎯 Summary

| Function | Purpose | Permission Required | Used For |
|----------|---------|---------------------|----------|
| `authorize(modules)` | Write operations | `write: true` | POST, PATCH, DELETE |
| `authorizeRead(modules)` | Read operations | `read: true` OR `write: true` | GET |

**The authorization middleware is a critical security layer that ensures users can only perform actions they have permission for, based on their role's module permissions.**

