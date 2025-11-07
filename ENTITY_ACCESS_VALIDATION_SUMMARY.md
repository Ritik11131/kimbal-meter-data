# 🔒 Entity Access Validation Summary

## Fixed Issue
**Problem**: When accessing resources from another tenant, the error was generic "Database operation failed" instead of a clear access denied message.

**Root Cause**: `validateEntityAccess()` was throwing a regular `Error` with `statusCode` property instead of `AppError`, causing catch blocks to convert it to a generic database error.

**Fix**: Updated `validateEntityAccess()` to throw `AppError` with proper HTTP status code (403 FORBIDDEN).

---

## Where Entity Access is Validated

### 1. **Profile Service** (`src/services/profile.service.ts`)

#### ✅ `listProfiles()` - Line 156
- **When**: Listing profiles by specific entityId
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Now throws `AppError` with message "You cannot access entities outside your hierarchy"
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `getProfileById()` - Line 38
- **When**: Getting a profile by ID
- **Validation**: `await validateEntityAccess(user.entityId, profile.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

#### ✅ `createProfile()` - Line 54
- **When**: Creating a profile with entity_id
- **Validation**: `await validateEntityAccess(user.entityId, data.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

---

### 2. **Role Service** (`src/services/role.service.ts`)

#### ✅ `listRolesByEntity()` - Line 101
- **When**: Listing roles by specific entityId
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Now throws `AppError` with message "You cannot access entities outside your hierarchy"
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `getRoleById()` - Line 28
- **When**: Getting a role by ID (if entity-scoped)
- **Validation**: `await validateEntityAccess(user.entityId, role.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

#### ✅ `createRole()` - Line 48
- **When**: Creating a role with entityId
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

---

### 3. **User Service** (`src/services/user.service.ts`)

#### ✅ `listUsers()` - Line 105
- **When**: Listing users by specific entityId
- **Validation**: `await validateEntityAccess(currentUser.entityId, entityId)`
- **Error**: Now throws `AppError` with message "You cannot access entities outside your hierarchy"
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `getUserById()` - Line 28
- **When**: Getting a user by ID
- **Validation**: `await validateEntityAccess(currentUser.entityId, user.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

#### ✅ `createUser()` - Line 37
- **When**: Creating a user with entity_id
- **Validation**: `await validateEntityAccess(user.entityId, data.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

---

### 4. **Meter Service** (`src/services/meter.service.ts`)

#### ✅ `listMeters()` - Line 70
- **When**: Listing meters by specific entityId
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Now throws `AppError` with message "You cannot access entities outside your hierarchy"
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `getMeterById()` - Line 18
- **When**: Getting a meter by ID
- **Validation**: `await validateEntityAccess(user.entityId, meter.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

#### ✅ `createMeter()` - Line 31
- **When**: Creating a meter with entityId
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

---

### 5. **Entity Service** (`src/services/entity.service.ts`)

#### ✅ `listEntities()` - Line 249
- **When**: Listing entities by specific entityId (parent filter)
- **Validation**: `await validateEntityAccess(user.entityId, entityId)`
- **Error**: Now throws `AppError` with message "You cannot access entities outside your hierarchy"
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `getEntityById()` - Line 32
- **When**: Getting an entity by ID
- **Validation**: `await validateEntityAccess(user.entityId, id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

#### ✅ `createEntity()` - Line 190
- **When**: Creating an entity with parent entity_id
- **Validation**: `await validateEntityAccess(user.entityId, data.entity_id)`
- **Error**: Throws `AppError` if access denied
- **Status**: ✅ Working correctly

---

### 6. **Middleware** (`src/middleware/hierarchy.ts`)

#### ✅ `enforceEntityAccess()` - Line 26
- **When**: Validating entity ID in route params
- **Validation**: `await validateEntityAccess(user.entityId, targetEntityId)`
- **Error**: Now throws `AppError` (via validateEntityAccess)
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `enforceEntityAccessQuery()` - Line 57
- **When**: Validating entity ID in query params or body
- **Validation**: `await validateEntityAccess(user.entityId, targetEntityId)`
- **Error**: Now throws `AppError` (via validateEntityAccess)
- **Status**: ✅ Fixed - Now throws proper AppError

#### ✅ `enforceResourceEntityAccess()` - Line 184
- **When**: Validating entity access for resources (user/role/profile/meter)
- **Validation**: `await validateEntityAccess(user.entityId, targetEntityId)`
- **Error**: Now throws `AppError` (via validateEntityAccess)
- **Status**: ✅ Fixed - Now throws proper AppError

---

## Error Message Format

**Before Fix:**
```json
{
  "success": false,
  "error": "Database operation failed",
  "timestamp": 1762498878440,
  "path": "/"
}
```

**After Fix:**
```json
{
  "success": false,
  "error": "You cannot access entities outside your hierarchy",
  "timestamp": 1762498878440,
  "path": "/api/profiles"
}
```

**HTTP Status Code**: `403 FORBIDDEN`

---

## Testing Checklist

- [x] Profile listing with invalid entityId
- [x] Role listing with invalid entityId
- [x] User listing with invalid entityId
- [x] Meter listing with invalid entityId
- [x] Entity listing with invalid entityId
- [x] All GET/PATCH/DELETE operations with invalid resource IDs
- [x] All POST operations with invalid entityId in body

---

## Summary

**Total Validation Points**: 20+
**Fixed**: All now throw proper `AppError` with clear messages
**Status**: ✅ All entity access validations now provide clear error messages

