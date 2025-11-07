# 🔒 Hierarchy Access Control Issues - Route Level Analysis

## Summary
This document lists all routes that are missing proper hierarchy/entity access middleware validation at the route level. While services validate access, we need defense-in-depth with middleware checks.

---

## ❌ CRITICAL ISSUES - Missing Entity Access Validation

### 1. **User Routes** (`src/routes/user.routes.ts`)

#### Issue 1.1: `GET /api/users/:id` - Missing Entity Access Check
- **Route**: `GET /api/users/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if user can access the target user's entity
- **Service Validation**: ✅ Service validates via `getUserById()` which calls `validateEntityAccess()`
- **Risk**: Medium - Service validates, but no defense-in-depth at route level
- **Fix Needed**: Add middleware that validates the target user's entity is accessible
- **Note**: Can't use `enforceEntityAccess("id")` because `id` is user ID, not entity ID. Need custom middleware or rely on service validation.

#### Issue 1.2: `PATCH /api/users/:id` - Missing Entity Access Check
- **Route**: `PATCH /api/users/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if user can access the target user's entity
- **Service Validation**: ✅ Service validates via `updateUser()` → `getUserById()` → `validateEntityAccess()`
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 1.1

#### Issue 1.3: `DELETE /api/users/:id` - Missing Entity Access Check
- **Route**: `DELETE /api/users/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if user can access the target user's entity
- **Service Validation**: ✅ Service validates via `deleteUser()` → `getUserById()` → `validateEntityAccess()`
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 1.1

---

### 2. **Role Routes** (`src/routes/role.routes.ts`)

#### Issue 2.1: `GET /api/roles/:id` - Missing Entity Access Check
- **Route**: `GET /api/roles/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if role is entity-scoped and user can access it
- **Service Validation**: ✅ Service validates via `getRoleById()` - checks if `role.entity_id` exists, then validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Add middleware that validates entity access for entity-scoped roles
- **Note**: Global roles (entity_id = null) are accessible to all, but entity-scoped roles need validation

#### Issue 2.2: `POST /api/roles` - Missing Entity Access Check for entityId
- **Route**: `POST /api/roles`
- **Current**: Only has `validate(createRoleSchema)`
- **Problem**: No middleware to validate `entityId` in request body if provided
- **Service Validation**: ✅ Service validates via `createRole()` - checks if `entityId` provided, then validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Add `enforceEntityAccessQuery("entityId")` middleware
- **Note**: `entityId` can be null (global role) or a UUID (entity-scoped role)

#### Issue 2.3: `PATCH /api/roles/:id` - Missing Entity Access Check
- **Route**: `PATCH /api/roles/:id`
- **Current**: Only has `validateUUIDParams(["id"])` and `validate(updateRoleSchema)`
- **Problem**: No middleware to check if role is entity-scoped and user can access it
- **Service Validation**: ✅ Service validates via `updateRole()` → `getRoleById()` → validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 2.1

#### Issue 2.4: `DELETE /api/roles/:id` - Missing Entity Access Check
- **Route**: `DELETE /api/roles/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if role is entity-scoped and user can access it
- **Service Validation**: ✅ Service validates via `deleteRole()` → `getRoleById()` → validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 2.1

---

### 3. **Profile Routes** (`src/routes/profile.routes.ts`)

#### Issue 3.1: `GET /api/profiles/:id` - Missing Entity Access Check
- **Route**: `GET /api/profiles/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if profile is entity-scoped and user can access it (or if global, only root admin)
- **Service Validation**: ✅ Service validates via `getProfileById()` - checks if global (root admin only) or entity-scoped (validates access)
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Add middleware that validates entity access for entity-scoped profiles

#### Issue 3.2: `PATCH /api/profiles/:id` - Missing Entity Access Check
- **Route**: `PATCH /api/profiles/:id`
- **Current**: Only has `validateUUIDParams(["id"])` and `validate(updateProfileSchema)`
- **Problem**: No middleware to check if profile is entity-scoped and user can access it
- **Service Validation**: ✅ Service validates via `updateProfile()` → `getProfileById()` → validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 3.1

#### Issue 3.3: `DELETE /api/profiles/:id` - Missing Entity Access Check
- **Route**: `DELETE /api/profiles/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if profile is entity-scoped and user can access it
- **Service Validation**: ✅ Service validates via `deleteProfile()` → `getProfileById()` → validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 3.1

---

### 4. **Meter Routes** (`src/routes/meter.routes.ts`)

#### Issue 4.1: `GET /api/meters/:id` - Missing Entity Access Check
- **Route**: `GET /api/meters/:id`
- **Current**: Only has `validateUUIDParams(["id"])`
- **Problem**: No middleware to check if user can access the meter's entity
- **Service Validation**: ✅ Service validates via `getMeterById()` → validates access to `meter.entity_id`
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Add middleware that validates the meter's entity is accessible
- **Note**: Can't use `enforceEntityAccess("id")` because `id` is meter ID, not entity ID. Need custom middleware.

#### Issue 4.2: `PATCH /api/meters/:id` - Missing Entity Access Check
- **Route**: `PATCH /api/meters/:id`
- **Current**: Only has `validateUUIDParams(["id"])` and `validate(updateMeterSchema)`
- **Problem**: No middleware to check if user can access the meter's entity
- **Service Validation**: ✅ Service validates via `updateMeter()` → `getMeterById()` → validates access
- **Risk**: Medium - Service validates, but no defense-in-depth
- **Fix Needed**: Same as 4.1

#### Issue 4.3: `DELETE /api/meters/:id` - Missing Route and Service Method!
- **Route**: `DELETE /api/meters/:id` - **DOES NOT EXIST**
- **Service Method**: `deleteMeter()` - **DOES NOT EXIST**
- **Problem**: No delete functionality for meters at all
- **Risk**: **HIGH** - Missing critical functionality
- **Fix Needed**: 
  1. Add `deleteMeter()` method to meter service
  2. Add DELETE route with proper entity access validation
  3. Add controller method for delete

---

### 5. **Module Routes** (`src/routes/module.routes.ts`)

#### Status: ✅ OK
- **Reason**: Modules are global (no entity_id), only root admin can access
- **Validation**: Enforced in service layer (checks `isRootAdmin`)
- **No middleware needed**: Root admin check is business logic, not hierarchy-based

---

## ✅ CORRECTLY IMPLEMENTED ROUTES

### Entity Routes - ✅ All Good
- All routes properly use `enforceEntityAccess()` or `validateParentEntityAccess()`

### User Routes - Partially Good
- ✅ `GET /api/users/entity/:entityId` - Has `enforceEntityAccess("entityId")`
- ✅ `POST /api/users` - Has `enforceEntityAccessQuery("entity_id")`

### Meter Routes - Partially Good
- ✅ `GET /api/meters/entity/:entityId` - Has `enforceEntityAccess("entityId")`
- ✅ `POST /api/meters` - Has `enforceEntityAccessQuery("entityId")`

---

## 🔧 RECOMMENDED FIXES

### Priority 1: High Risk (Missing Functionality)
1. **Add DELETE route for meters** with proper entity access validation

### Priority 2: Medium Risk (Defense in Depth)
2. **Add entity access middleware for user operations** (GET/PATCH/DELETE by user ID)
3. **Add entity access middleware for role operations** (GET/PATCH/DELETE by role ID)
4. **Add entity access middleware for profile operations** (GET/PATCH/DELETE by profile ID)
5. **Add entity access middleware for meter operations** (GET/PATCH by meter ID)
6. **Add entity access middleware for role creation** (POST with entityId in body)

### Implementation Strategy

For routes where the ID is not the entity ID (users, meters, roles, profiles), we have two options:

**Option A**: Create new middleware that:
- Fetches the resource by ID
- Extracts the entity_id from the resource
- Validates entity access

**Option B**: Rely on service layer validation (current approach)
- Services already validate access
- Add middleware only where entity ID is directly available

**Recommendation**: Option A for defense-in-depth, but Option B is acceptable if services are trusted.

---

## 📊 Summary Table

| Route | Method | Missing Middleware | Service Validates | Risk Level |
|-------|--------|-------------------|-------------------|------------|
| `/api/users/:id` | GET | ✅ Yes | ✅ Yes | Medium |
| `/api/users/:id` | PATCH | ✅ Yes | ✅ Yes | Medium |
| `/api/users/:id` | DELETE | ✅ Yes | ✅ Yes | Medium |
| `/api/roles/:id` | GET | ✅ Yes | ✅ Yes | Medium |
| `/api/roles` | POST | ✅ Yes (entityId) | ✅ Yes | Medium |
| `/api/roles/:id` | PATCH | ✅ Yes | ✅ Yes | Medium |
| `/api/roles/:id` | DELETE | ✅ Yes | ✅ Yes | Medium |
| `/api/profiles/:id` | GET | ✅ Yes | ✅ Yes | Medium |
| `/api/profiles/:id` | PATCH | ✅ Yes | ✅ Yes | Medium |
| `/api/profiles/:id` | DELETE | ✅ Yes | ✅ Yes | Medium |
| `/api/meters/:id` | GET | ✅ Yes | ✅ Yes | Medium |
| `/api/meters/:id` | PATCH | ✅ Yes | ✅ Yes | Medium |
| `/api/meters/:id` | DELETE | ❌ Route Missing | ❌ N/A | **HIGH** |

---

**Generated**: $(date)
**Status**: Ready for Review

