# 🔒 Route-Level Hierarchy Access Control Issues

## Executive Summary

**Total Issues Found: 12**

- **High Priority**: 1 (Missing DELETE meter functionality)
- **Medium Priority**: 11 (Missing middleware for defense-in-depth)

---

## 📋 DETAILED ISSUE LIST

### 🔴 HIGH PRIORITY

#### 1. **Meter DELETE Route Missing**
- **File**: `src/routes/meter.routes.ts`
- **Issue**: No DELETE route exists for meters
- **Missing**:
  - ❌ DELETE route handler
  - ❌ `deleteMeter()` service method
  - ❌ Controller `remove()` method
- **Impact**: Users cannot delete meters via API
- **Fix Required**: Complete implementation needed

---

### ⚠️ MEDIUM PRIORITY - Missing Entity Access Middleware

#### 2. **User Routes - GET /api/users/:id**
- **File**: `src/routes/user.routes.ts:13`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation middleware
- **Service Validation**: ✅ Yes (validates via `getUserById()`)
- **Note**: Can't use `enforceEntityAccess("id")` because `id` is user ID, not entity ID

#### 3. **User Routes - PATCH /api/users/:id**
- **File**: `src/routes/user.routes.ts:20`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation middleware
- **Service Validation**: ✅ Yes (validates via `updateUser()` → `getUserById()`)

#### 4. **User Routes - DELETE /api/users/:id**
- **File**: `src/routes/user.routes.ts:24`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation middleware
- **Service Validation**: ✅ Yes (validates via `deleteUser()` → `getUserById()`)

#### 5. **Role Routes - GET /api/roles/:id**
- **File**: `src/routes/role.routes.ts:15`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation for entity-scoped roles
- **Service Validation**: ✅ Yes (validates if `role.entity_id` exists)
- **Note**: Global roles (entity_id = null) are accessible to all, but entity-scoped need validation

#### 6. **Role Routes - POST /api/roles**
- **File**: `src/routes/role.routes.ts:17`
- **Current**: `validate(createRoleSchema)` only
- **Missing**: `enforceEntityAccessQuery("entityId")` middleware
- **Service Validation**: ✅ Yes (validates if `entityId` provided)
- **Note**: `entityId` can be null (global) or UUID (entity-scoped)

#### 7. **Role Routes - PATCH /api/roles/:id**
- **File**: `src/routes/role.routes.ts:21`
- **Current**: `validateUUIDParams(["id"])` and `validate(updateRoleSchema)` only
- **Missing**: Entity access validation for entity-scoped roles
- **Service Validation**: ✅ Yes (validates via `updateRole()` → `getRoleById()`)

#### 8. **Role Routes - DELETE /api/roles/:id**
- **File**: `src/routes/role.routes.ts:25`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation for entity-scoped roles
- **Service Validation**: ✅ Yes (validates via `deleteRole()` → `getRoleById()`)

#### 9. **Profile Routes - GET /api/profiles/:id**
- **File**: `src/routes/profile.routes.ts:19`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation for entity-scoped profiles
- **Service Validation**: ✅ Yes (validates global vs entity-scoped)

#### 10. **Profile Routes - PATCH /api/profiles/:id**
- **File**: `src/routes/profile.routes.ts:29`
- **Current**: `validateUUIDParams(["id"])` and `validate(updateProfileSchema)` only
- **Missing**: Entity access validation for entity-scoped profiles
- **Service Validation**: ✅ Yes (validates via `updateProfile()` → `getProfileById()`)

#### 11. **Profile Routes - DELETE /api/profiles/:id**
- **File**: `src/routes/profile.routes.ts:34`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation for entity-scoped profiles
- **Service Validation**: ✅ Yes (validates via `deleteProfile()` → `getProfileById()`)

#### 12. **Meter Routes - GET /api/meters/:id**
- **File**: `src/routes/meter.routes.ts:13`
- **Current**: `validateUUIDParams(["id"])` only
- **Missing**: Entity access validation middleware
- **Service Validation**: ✅ Yes (validates via `getMeterById()`)

#### 13. **Meter Routes - PATCH /api/meters/:id**
- **File**: `src/routes/meter.routes.ts:20`
- **Current**: `validateUUIDParams(["id"])` and `validate(updateMeterSchema)` only
- **Missing**: Entity access validation middleware
- **Service Validation**: ✅ Yes (validates via `updateMeter()` → `getMeterById()`)

---

## ✅ CORRECTLY IMPLEMENTED ROUTES

### Entity Routes - ✅ Perfect
- All routes have proper `enforceEntityAccess()` or `validateParentEntityAccess()`

### User Routes - ✅ Partial
- ✅ `GET /api/users/entity/:entityId` - Has `enforceEntityAccess("entityId")`
- ✅ `POST /api/users` - Has `enforceEntityAccessQuery("entity_id")`

### Meter Routes - ✅ Partial
- ✅ `GET /api/meters/entity/:entityId` - Has `enforceEntityAccess("entityId")`
- ✅ `POST /api/meters` - Has `enforceEntityAccessQuery("entityId")`

### Module Routes - ✅ OK
- Modules are global, only root admin check needed (enforced in service)

---

## 🔧 RECOMMENDED SOLUTION

### Option 1: Create Resource-Based Entity Access Middleware (Recommended)

Create a new middleware that:
1. Fetches the resource (user/role/profile/meter) by ID
2. Extracts the `entity_id` from the resource
3. Validates entity access using existing `validateEntityAccess()`

**Pros**: Defense-in-depth, catches issues early
**Cons**: Extra database query per request

### Option 2: Rely on Service Layer (Current Approach)

Keep current implementation where services validate access.

**Pros**: No extra queries, simpler
**Cons**: Less defense-in-depth, validation happens later in the flow

### Option 3: Hybrid Approach (Best Practice)

- Use middleware for routes where entity ID is directly available (query params, body)
- Rely on service validation for routes where we need to fetch resource first
- Add explicit comments explaining why middleware is/isn't used

---

## 📊 Issue Breakdown by Resource Type

| Resource | GET by ID | POST | PATCH | DELETE | Total Issues |
|----------|----------|------|-------|--------|--------------|
| **Users** | ❌ Missing | ✅ OK | ❌ Missing | ❌ Missing | 3 |
| **Roles** | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | 4 |
| **Profiles** | ❌ Missing | ✅ OK | ❌ Missing | ❌ Missing | 3 |
| **Meters** | ❌ Missing | ✅ OK | ❌ Missing | ❌ **Route Missing** | 3 + 1 missing route |
| **Modules** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | 0 |
| **Entities** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | 0 |

---

## 🎯 Action Items

### Immediate (High Priority)
1. ✅ Add DELETE meter route, service method, and controller
2. ✅ Add entity access validation to DELETE meter route

### Short Term (Medium Priority - Defense in Depth)
3. Add entity access middleware for user operations (GET/PATCH/DELETE by user ID)
4. Add entity access middleware for role operations (GET/PATCH/DELETE by role ID)
5. Add entity access middleware for profile operations (GET/PATCH/DELETE by profile ID)
6. Add entity access middleware for meter operations (GET/PATCH by meter ID)
7. Add `enforceEntityAccessQuery("entityId")` to role creation route

---

**Status**: Ready for Implementation
**Priority**: Fix High Priority items first, then add defense-in-depth middleware

