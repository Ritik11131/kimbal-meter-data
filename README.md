# Smart Meter System Backend

Enterprise-grade backend for a multi-tenant smart meter management system built with Node.js, Express, PostgreSQL, and Sequelize ORM.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Entity Hierarchy Model](#entity-hierarchy-model)
4. [Code Flow & Request Processing](#code-flow--request-processing)
5. [Business Logic](#business-logic)
6. [Security & Access Control](#security--access-control)
7. [Project Structure](#project-structure)
8. [API Documentation](#api-documentation)
9. [Installation & Setup](#installation--setup)

---

## System Overview

### Entity Hierarchy Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    ETL Admin (Root Entity)                      │
│                  Profile: Admin                                 │
│              User: Ritik Gupta (Admin Role)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼──────────────┐      ┌──────────▼──────────────┐
│   KMP (Tenant)       │      │  Test Tenant (Tenant)   │
│ Profile: Tenant      │      │ Profile: Tenant         │
│ Role: Tenant Admin   │      │ Role: Tenant Admin      │
└───────┬──────────────┘      └─────────────────────────┘
        │
┌───────▼──────────────────────┐
│  Ideal Energy (Customer)     │
│  Profile: Customer           │
│  Role: Customer Admin        │
└───────┬──────────────────────┘
        │
    ┌───┴───────────────┐
    │                   │
┌───▼─────────────┐  ┌──▼──────────────────────┐
│   Patanjali     │  │  NAWLA ISPAT PVT LTD    │
│  (Consumer)     │  │  (Consumer)             │
│ Profile:        │  │  Profile: Consumer      │
│  Consumer       │  │  Meters: (None yet)     │
└─────────────────┘  └─────────────────────────┘
```

### Core Concepts

- **Multi-Tenancy**: Each tenant (e.g., KMP Energy) has isolated data access
- **Hierarchical Access**: Users can only access entities within their hierarchy
- **Role-Based Access Control (RBAC)**: Permissions based on roles and modules
- **Entity Types**: Root → Tenant → Customer → Consumer
- **Smart Meters**: PHYSICAL, VIRTUAL, or GROUP meters associated with entities

---

## Architecture

### Layered Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS MIDDLEWARE LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   CORS       │  │   Helmet    │  │   Morgan     │     │
│  │  (Security)  │  │  (Headers)  │  │  (Logging)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      ROUTING LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /auth    │  │/entities │  │ /users   │  │ /meters  │  │
│  │ /roles   │  └──────────┘  └──────────┘  └──────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE CHAIN                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ Authentication │→ │ Authorization  │→ │  Hierarchy   │ │
│  │   (JWT Verify) │  │  (RBAC Check)  │  │  Isolation   │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │  Validation    │→ │ Error Handler │                   │
│  │  (Joi Schema)  │  │  (AppError)   │                   │
│  └────────────────┘  └────────────────┘                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONTROLLER LAYER                         │
│  • Parse request/response                                   │
│  • Call service methods                                     │
│  • Handle HTTP status codes                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                          │
│  • Business logic validation                               │
│  • Hierarchy access checks                                 │
│  • Data transformation                                     │
│  • Error handling                                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    REPOSITORY LAYER                           │
│  • Database queries (Sequelize ORM)                        │
│  • Hierarchy-scoped queries                                │
│  • Data mapping                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│                    PostgreSQL Database                       │
│  • Entities, Users, Roles, Meters                           │
│  • Hierarchical relationships                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌─────────┐
│  Route  │─────▶│Middleware│─────▶│Controller│─────▶│ Service  │─────▶│Repository│
└─────────┘      └──────────┘      └──────────┘      └──────────┘      └─────────┘
     │                │                  │                  │                  │
     │                │                  │                  │                  │
     ▼                ▼                  ▼                  ▼                  ▼
   Define         Auth Check        Parse Request    Business Logic    Execute Query
   Endpoints      Validate          Call Service     Validate Access   Return Data
   Apply MW      Check Perms       Send Response    Transform Data    Map Results
```

---

## Entity Hierarchy Model

### Database Relationships

```
┌─────────────┐
│   ENTITY    │◄─────┐ (self-referencing)
│             │      │ entity_id (FK)
│ • id        │      │
│ • name      │      │
│ • entity_id │──────┘
│ • profile_id│──┐
└─────────────┘  │
                 │
                 │      ┌─────────────┐
                 │      │   PROFILE   │
                 └──────▶│             │
                        │ • id        │
                        │ • name      │
                        └─────────────┘

┌─────────────┐         ┌─────────────┐
│    USER     │         │    ROLE     │
│             │         │             │
│ • id        │         │ • id        │
│ • email     │         │ • name      │
│ • entity_id │─────────┼▶• entity_id │
│ • role_id   │─────────┼▶• attributes │
└─────────────┘         └─────────────┘

┌─────────────┐
│   METER     │
│             │
│ • id        │
│ • name      │
│ • type      │
│ • entity_id │─────────┐
│ • attributes│         │
└─────────────┘         │
                        │
                        │ (belongs to)
                        │
                   ┌────▼─────┐
                   │  ENTITY  │
                   └──────────┘
```

### Hierarchy Access Rules

**Access Grant Conditions:**
1. User's entity ID == Target entity ID (same entity)
2. Target entity is descendant of user's entity (child/grandchild)

**Access Denied Conditions:**
1. Target entity is ancestor of user's entity
2. Target entity is in completely different branch (sibling branch)

**Example:**
```
User from "KMP" (Tenant) can access:
✅ KMP (self)
✅ Ideal Energy (child)
✅ Patanjali (grandchild)
✅ NAWLA (grandchild)

User from "KMP" (Tenant) CANNOT access:
❌ ETL Admin (parent/ancestor)
❌ Test Tenant (sibling branch)
❌ Any entities under Test Tenant
```

---

## Code Flow & Request Processing

### Complete Request Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        HTTP REQUEST                                  │
│                  GET /api/entities/:id                             │
│                  Authorization: Bearer <token>                     │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 1: Express App (app.ts)                                        │
│   • Parse request                                                   │
│   • Apply global middleware (CORS, Helmet, Morgan)                │
│   • Route to /api/entities                                          │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 2: Route Handler (routes/entity.routes.ts)                     │
│   router.get("/:id", authenticate, enforceEntityAccess(), ...)     │
│   • Matches route pattern                                          │
│   • Sets up middleware chain                                        │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 3: Authentication Middleware (middleware/authentication.ts)   │
│   1. Extract token from Authorization header                       │
│   2. Verify JWT using JwtUtil.verify()                             │
│   3. Extract payload (userId, entityId, roleId, permissions)       │
│   4. Attach AuthContext to req.user                                │
│                                                                     │
│   Result: req.user = {                                              │
│     userId: "user-uuid",                                           │
│     entityId: "kmp-entity-uuid",                                   │
│     roleId: "tenant-admin-role-uuid",                              │
│     permissions: [...]                                             │
│   }                                                                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 4: Hierarchy Middleware (middleware/hierarchy.ts)             │
│   enforceEntityAccess("id")                                        │
│   1. Extract target entity ID from req.params.id                  │
│   2. Get user's entityId from req.user.entityId                    │
│   3. Call validateEntityAccess(userEntityId, targetEntityId)       │
│                                                                     │
│   validateEntityAccess():                                          │
│   • Call canAccessEntity() to check hierarchy                      │
│   • Throws 403 if access denied                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 5: Hierarchy Utility (utils/hierarchy.ts)                     │
│   canAccessEntity(userEntityId, targetEntityId):                    │
│   1. If userEntityId === targetEntityId → return true              │
│   2. Call getAccessibleEntityIds(userEntityId)                     │
│      • Executes recursive CTE query                                │
│      • Returns all descendant entity IDs                           │
│   3. Check if targetEntityId in accessibleIds array                │
│                                                                     │
│   SQL Query (PostgreSQL Recursive CTE):                            │
│   WITH RECURSIVE entity_tree AS (                                  │
│     SELECT id FROM entities WHERE id = :userEntityId              │
│     UNION ALL                                                      │
│     SELECT e.id FROM entities e                                   │
│     INNER JOIN entity_tree et ON e.entity_id = et.id              │
│   )                                                                │
│   SELECT id FROM entity_tree;                                      │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 6: Controller (controllers/entity.controller.ts)              │
│   getById(req, res):                                               │
│   1. Extract entity ID from req.params.id                          │
│   2. Get user context from req.user                                 │
│   3. Call entityService.getEntityById(id, user)                    │
│   4. Send response or handle error                                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 7: Service Layer (services/entity.service.ts)                 │
│   getEntityById(id, user):                                         │
│   1. Call repository.findById(id)                                 │
│   2. Check if entity exists (throw 404 if not)                     │
│   3. Call validateEntityAccess(user.entityId, id) again            │
│      (defense in depth - double check)                             │
│   4. Return entity                                                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 8: Repository Layer (repositories/entity.repository.ts)       │
│   findById(id):                                                     │
│   1. Use Sequelize: Entity.findByPk(id)                            │
│   2. Return entity or null                                         │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 9: Database Query                                              │
│   SELECT * FROM entities WHERE id = :id                             │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Step 10: Response Flow (Reverse Path)                              │
│   Repository → Service → Controller → Response                      │
│                                                                     │
│   Response Format:                                                  │
│   {                                                                 │
│     "success": true,                                               │
│     "data": { entity object },                                     │
│     "message": "Entity retrieved",                                │
│     "timestamp": 1234567890                                        │
│   }                                                                 │
└────────────────────────────────────────────────────────────────────┘
```

### Create Entity Flow (with Hierarchy Validation)

```
┌────────────────────────────────────────────────────────────────────┐
│ POST /api/entities                                                  │
│ Body: { name, email_id, profile_id, entity_id (parent) }          │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Middleware Chain:                                                   │
│ 1. authenticate → Verify JWT, extract user context                │
│ 2. requireWritePermission([MODULES.ENTITY]) → Check write permission │
│ 3. validateParentEntityAccess() → Validate parent is accessible   │
│ 4. validate(createEntitySchema) → Validate request body           │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ validateParentEntityAccess() Logic:                                │
│ 1. Extract parentEntityId from req.body.entity_id                 │
│ 2. If no parent → Creating root entity, allow                     │
│ 3. If parent exists → validateEntityAccess(user.entityId, parent)  │
│ 4. Only allow if parent is in user's accessible hierarchy          │
└────────────────────────────┬───────────────────────────────────────┘
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│ Controller → Service → Repository                                  │
│                                                                     │
│ Service.createEntity():                                             │
│ 1. Validate parent entity exists (if provided)                    │
│ 2. Validate user can access parent entity                          │
│ 3. Create entity with created_by = user.userId                    │
│ 4. Return created entity                                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## Business Logic

### 1. Entity Hierarchy Management

**Purpose**: Maintain hierarchical relationships between organizations

**Business Rules**:
- Root entities have `entity_id = null`
- Child entities reference parent via `entity_id` foreign key
- Hierarchy cannot have cycles (enforced by database constraints)
- Deleting an entity affects all descendants (cascade rules)

**Implementation**:
```typescript
// utils/hierarchy.ts
getAccessibleEntityIds(entityId: string): Promise<string[]>
// Uses PostgreSQL recursive CTE to find all descendants

// Example: If user is from "KMP" tenant
// Returns: [kmp-id, ideal-energy-id, patanjali-id, nawla-id]
```

### 2. Access Control & Isolation

**Purpose**: Ensure users can only access data within their entity hierarchy

**Business Rules**:
- Users belong to an entity (`users.entity_id`)
- Users can access:
  - Their own entity
  - All descendant entities (children, grandchildren, etc.)
- Users cannot access:
  - Parent entities
  - Sibling entities (entities in different branches)

**Implementation Flow**:
```typescript
// Middleware validates before controller
enforceEntityAccess() → validateEntityAccess() → canAccessEntity()

// Service validates again (defense in depth)
service.getEntityById() → validateEntityAccess()

// Repository queries can use hierarchy scoping
repository.findByAccessibleEntities(userEntityId)
```

### 3. User Management

**Purpose**: Manage user accounts with proper access control

**Business Rules**:
- Users must belong to an entity
- Users have a role (permissions stored in role)
- Only accessible-entity users can be created/updated
- Password hashing with bcryptjs (salt + hash)

**Implementation**:
```typescript
// Service validates entity access before creating user
createUser(data, user):
  1. validateEntityAccess(user.entityId, data.entity_id)
  2. Check email/mobile uniqueness
  3. Hash password with salt
  4. Create user with entity_id and role_id
```

### 4. Role-Based Access Control (RBAC)

**Purpose**: Control access to modules based on roles

**Business Rules**:
- Roles can be global (`entity_id = null`) or entity-scoped
- Permissions stored as JSON array in `roles.attributes`
- Each permission has: `moduleId`, `name`, `read`, `write`
- Modules: Entity, User, Role, Profile, Module, Meter

**Implementation**:
```typescript
// middleware/authorization.ts
requireWritePermission(modules: string[]):
  - Checks req.user.permissions
  - Validates user has 'write' permission for module
  - Used for POST, PATCH, DELETE operations
  - Throws 403 if denied

requireReadPermission(modules: string[]):
  - Checks req.user.permissions
  - Validates user has 'read' OR 'write' permission
  - Used for GET operations
  - Throws 403 if denied
```

### 5. Meter Management

**Purpose**: Manage smart meter devices for entities

**Business Rules**:
- Meters belong to entities (consumers typically)
- Meter types: PHYSICAL, VIRTUAL, GROUP
- Only accessible-entity meters can be created/accessed
- Meters can have ThingsBoard integration (tb_ref_id, tb_token)

**Implementation**:
```typescript
// Service validates entity access
createMeter(entityId, name, type, user):
  1. validateEntityAccess(user.entityId, entityId)
  2. Validate meter type enum
  3. Create meter with entity_id
```

---

## Security & Access Control

### Security Layers Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
│                                                                  │
│  Layer 1: Network Security                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   Helmet   │  │    CORS    │  │   HTTPS    │              │
│  │ (Headers)  │  │ (Origins)  │  │  (TLS)     │              │
│  └────────────┘  └────────────┘  └────────────┘              │
│                                                                  │
│  Layer 2: Authentication                                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  JWT Token Verification                               │     │
│  │  • Extract token from Authorization header           │     │
│  │  • Verify signature with JWT_SECRET                  │     │
│  │  • Extract user context (userId, entityId, roleId)   │     │
│  │  • Attach to req.user                                │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 3: Authorization (RBAC)                                  │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Permission Check                                    │     │
│  │  • Check req.user.permissions                        │     │
│  │  • Validate module access (read/write)              │     │
│  │  • Throw 403 if insufficient permissions           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 4: Hierarchy Isolation                                  │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Entity Access Validation                             │     │
│  │  • Check entity hierarchy                            │     │
│  │  • Validate user can access target entity            │     │
│  │  • Prevent cross-tenant data access                  │     │
│  │  • Throws 403 if outside hierarchy                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 5: Input Validation                                      │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Joi Schema Validation                               │     │
│  │  • Validate request body/query/params                │     │
│  │  • Type checking, format validation                 │     │
│  │  • SQL injection prevention (Sequelize ORM)         │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                  │
│  Layer 6: Data Access Layer                                      │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Repository Queries                                  │     │
│  │  • Sequelize ORM (parameterized queries)             │     │
│  │  • Hierarchy-scoped queries                         │     │
│  │  • Soft deletes (is_deleted flag)                   │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌──────────┐
│  Client  │
│          │ 1. POST /api/auth/login
│          │    { email, password }
└────┬─────┘
     │
     ▼
┌──────────────────────────────────────────────────────┐
│ Auth Service (services/auth.service.ts)              │
│ 1. Find user by email                                 │
│ 2. Compare password (bcrypt compare)                 │
│ 3. Generate JWT token                                 │
│    Payload: {                                         │
│      userId, entityId, roleId, email, permissions    │
│    }                                                   │
│ 4. Return token + user info                           │
└────┬──────────────────────────────────────────────────┘
     │
     ▼
┌──────────┐
│  Client  │ Stores token in localStorage/sessionStorage
│          │
│          │ 2. Subsequent requests:
│          │    Authorization: Bearer <token>
└──────────┘
```

### Authorization Decision Tree

```
                    Request Received
                           │
                           ▼
                    ┌──────────────┐
                    │ Has JWT Token?│
                    └──┬─────────┬──┘
                       │         │
                  Yes  │         │ No
                       │         │
                       ▼         ▼
            ┌──────────────┐  ┌─────────────┐
            │ Token Valid? │  │ Return 401 │
            └──┬─────────┬──┘  └─────────────┘
               │         │
          Yes  │         │ No
               │         │
               ▼         ▼
    ┌──────────────────┐  ┌─────────────┐
    │ Has Module Perm?  │  │ Return 403  │
    └──┬─────────────┬──┘  └─────────────┘
       │             │
  Yes  │             │ No
       │             │
       ▼             ▼
┌──────────────┐  ┌─────────────┐
│ Entity Access│  │ Return 403  │
│  Valid?      │  └─────────────┘
└──┬────────┬──┘
   │        │
Yes│        │No
   │        │
   ▼        ▼
┌──────┐  ┌─────────────┐
│Allow │  │ Return 403  │
└──────┘  └─────────────┘
```

---

## Project Structure

```
src/
├── config/                    # Configuration files
│   ├── environment.ts        # Environment variables loader
│   ├── constants.ts          # Application constants (MODULES, HTTP_STATUS, etc.)
│   └── database.js           # Sequelize configuration
│
├── models/                    # Sequelize ORM models
│   ├── Entity.ts            # Entity model (hierarchical)
│   ├── User.ts              # User model
│   ├── Role.ts              # Role model (with permissions)
│   ├── Meter.ts             # Meter model
│   ├── Profile.ts           # Profile model
│   ├── Module.ts            # Module model
│   ├── EntityMeter.ts       # Junction table
│   └── index.ts             # Model associations & initialization
│
├── database/                 # Database connection management
│   ├── connection.ts        # Sequelize connection setup
│   └── sequelize-connection.ts
│
├── repositories/             # Data access layer
│   ├── base.repository.ts  # Generic repository with CRUD operations
│   ├── entity.repository.ts # Entity-specific queries (hierarchy, pagination)
│   ├── user.repository.ts   # User-specific queries
│   ├── role.repository.ts   # Role-specific queries
│   ├── meter.repository.ts  # Meter-specific queries
│   ├── profile.repository.ts # Profile-specific queries ⭐ NEW
│   └── module.repository.ts  # Module-specific queries ⭐ NEW
│
├── services/                 # Business logic layer
│   ├── auth.service.ts      # Authentication logic (login, token generation)
│   ├── entity.service.ts    # Entity business logic (hierarchy validation)
│   ├── user.service.ts      # User business logic
│   ├── role.service.ts     # Role business logic
│   ├── meter.service.ts    # Meter business logic
│   ├── profile.service.ts  # Profile business logic (root/entity admin access) ⭐ NEW
│   └── module.service.ts   # Module business logic (root admin only) ⭐ NEW
│
├── controllers/              # Request/response handlers
│   ├── auth.controller.ts  # Auth endpoints (login, register)
│   ├── entity.controller.ts # Entity CRUD endpoints
│   ├── user.controller.ts  # User CRUD endpoints
│   ├── role.controller.ts  # Role CRUD endpoints
│   ├── meter.controller.ts # Meter CRUD endpoints
│   ├── profile.controller.ts # Profile CRUD endpoints ⭐ NEW
│   └── module.controller.ts  # Module CRUD endpoints ⭐ NEW
│
├── routes/                   # Express route definitions
│   ├── index.ts             # Route aggregator
│   ├── auth.routes.ts      # Authentication routes
│   ├── entity.routes.ts    # Entity routes with middleware
│   ├── user.routes.ts      # User routes with middleware
│   ├── role.routes.ts      # Role routes with middleware
│   ├── meter.routes.ts     # Meter routes with middleware
│   ├── profile.routes.ts   # Profile routes with middleware ⭐ NEW
│   └── module.routes.ts    # Module routes with middleware ⭐ NEW
│
├── middleware/               # Express middleware
│   ├── authentication.ts   # JWT token verification
│   ├── authorization.ts     # RBAC permission checks
│   ├── hierarchy.ts        # Hierarchy isolation middleware ⭐ NEW
│   ├── errorHandler.ts     # Global error handler
│   └── requestLogger.ts    # Request logging
│
├── validators/               # Input validation schemas (Joi)
│   ├── auth.validator.ts
│   ├── entity.validator.ts
│   ├── user.validator.ts
│   ├── role.validator.ts
│   ├── meter.validator.ts
│   ├── profile.validator.ts ⭐ NEW
│   └── module.validator.ts  ⭐ NEW
│
├── utils/                   # Utility functions
│   ├── hierarchy.ts        # Hierarchy utility functions ⭐ NEW
│   ├── jwt.ts              # JWT token utilities
│   ├── cryptography.ts     # Password hashing utilities
│   ├── validation.ts       # Joi validation wrapper
│   ├── response.ts         # Response formatting
│   └── logger.ts          # Winston logger setup
│
├── types/                    # TypeScript type definitions
│   ├── common.ts           # Common types (AuthContext, ApiResponse)
│   ├── entities.ts         # Entity-related types
│   └── users.ts            # User-related types
│
└── app.ts                   # Express application setup
```

### Key Files Explained

#### `src/utils/hierarchy.ts` ⭐ NEW
**Purpose**: Hierarchy access control utilities

**Functions**:
- `getAccessibleEntityIds()` - Get all descendant entity IDs using recursive CTE
- `getAncestorEntityIds()` - Get all ancestor entity IDs
- `canAccessEntity()` - Check if user can access target entity
- `validateEntityAccess()` - Throw error if access denied
- `getRootEntityId()` - Find root entity in hierarchy

#### `src/middleware/hierarchy.ts` ⭐ NEW
**Purpose**: Middleware for hierarchy-based access control

**Middleware**:
- `enforceEntityAccess()` - Validate entity ID in params/body
- `enforceEntityAccessQuery()` - Validate entity ID in query/body
- `validateParentEntityAccess()` - Validate parent entity when creating children

#### `src/services/entity.service.ts`
**Purpose**: Entity business logic with hierarchy validation

**Key Methods**:
- `getEntityById()` - Validates hierarchy access before returning
- `createEntity()` - Validates parent entity access
- `listEntities()` - Filters by accessible entities
- `updateEntity()` / `deleteEntity()` - Validates access before operations

---

## API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`
**Purpose**: Authenticate user and return JWT token

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "entityId": "entity-uuid",
      "roleId": "role-uuid"
    }
  }
}
```

**Flow**:
1. Validate email/password
2. Find user by email
3. Compare password hash
4. Generate JWT with user context
5. Return token + user info

---

### Entity Endpoints

#### `GET /api/entities/:id`
**Purpose**: Get entity by ID (with hierarchy validation)

**Headers**: `Authorization: Bearer <token>`

**Flow**:
1. `authenticate` → Verify JWT
2. `enforceEntityAccess("id")` → Validate entity access
3. Controller → Service → Repository
4. Return entity if accessible

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "entity-uuid",
    "name": "KMP Energy",
    "email_id": "admin@kmp.com",
    "entity_id": "parent-entity-uuid",
    "profile_id": "profile-uuid"
  }
}
```

#### `GET /api/entities`
**Purpose**: List entities (filtered by accessible hierarchy)

**Query Params**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)
- `profileId` (optional): Filter by profile ID
- `entityId` (optional): Filter by entity ID. Use `null` to get root entities

**Flow**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.ENTITY])` → Check read permission
3. `validateQuery(entityListQuerySchema)` → Validate query parameters
4. `enforceEntityAccessQuery("entityId")` → Validate entity access
5. Controller extracts query parameters
6. Service gets accessible entity IDs
7. Repository filters entities by accessible IDs
8. Returns paginated results

**Example Request**:
```bash
GET /api/entities?page=1&limit=10&profileId=profile-uuid
GET /api/entities?page=1&limit=10&entityId=null
```

**Response**:
```json
{
  "success": true,
  "message": "Entities listed successfully",
  "data": [
    {
      "id": "entity-uuid",
      "name": "Ideal Energy",
      "email_id": "admin@ideal.com",
      "entity_id": "parent-entity-uuid",
      "profile_id": "profile-uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/entities"
}
```

#### `POST /api/entities`
**Purpose**: Create new entity (with parent validation)

**Request**:
```json
{
  "name": "Ideal Energy",
  "email_id": "admin@ideal.com",
  "profile_id": "customer-profile-uuid",
  "entity_id": "kmp-entity-uuid"
}
```

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireWritePermission([MODULES.ENTITY])` → Check write permission
3. `validateParentEntityAccess()` → Validate parent is accessible
4. `validate(createEntitySchema)` → Validate request body
5. Controller → Service → Repository

**Business Logic**:
- Validates parent entity exists
- Validates user can access parent entity
- Creates entity with `created_by = user.userId`

#### `GET /api/entities/:id/hierarchy`
**Purpose**: Get full hierarchy tree from entity

**Query Params**:
- `depth` (optional): Maximum depth levels to load (default: unlimited)
- `page` (optional): Page number (required if `paginateRootChildren=true`)
- `limit` (optional): Items per page (required if `paginateRootChildren=true`, max: 100)
- `paginateRootChildren` (optional): Enable pagination for root entity's direct children (boolean or string: "true"/"false"/"1"/"0")

**Flow**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.ENTITY])` → Check read permission
3. `validateUUIDParams(["id"])` → Validate entity ID format
4. `validateQuery(hierarchyQuerySchema)` → Validate query parameters
5. `enforceEntityAccess()` → Validate entity access
6. Service validates access
7. Repository executes recursive CTE query or paginated query
8. Returns hierarchy tree

**Example Requests**:
```bash
# Full hierarchy (unlimited depth)
GET /api/entities/entity-uuid/hierarchy

# Limited depth (only direct children)
GET /api/entities/entity-uuid/hierarchy?depth=1

# Paginated root children (for large datasets)
GET /api/entities/entity-uuid/hierarchy?paginateRootChildren=true&page=1&limit=20
```

---

### User Endpoints

#### `GET /api/users`
**Purpose**: List users (filtered by accessible hierarchy)

**Query Params**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)
- `entityId` (optional): Filter by entity ID. Use `null` to get users from root entity

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.USER])` → Check read permission
3. `validateQuery(userListQuerySchema)` → Validate query parameters
4. `enforceEntityAccessQuery("entityId")` → Validate entity access
5. Controller → Service → Repository

**Example Request**:
```bash
GET /api/users?page=1&limit=10
GET /api/users?page=1&limit=10&entityId=entity-uuid
```

**Response**:
```json
{
  "success": true,
  "message": "Users listed",
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "entity_id": "entity-uuid",
      "role_id": "role-uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/users"
}
```

#### `GET /api/users/:id`
**Purpose**: Get user by ID (validates entity access)

**Flow**:
1. `authenticate` → Verify JWT
2. Controller → Service
3. Service validates user's entity is accessible
4. Returns user (without password)

#### `POST /api/users`
**Purpose**: Create user (validates entity access)

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "mobile_no": "1234567890",
  "entity_id": "entity-uuid",
  "role_id": "role-uuid"
}
```

**Middleware**:
- `authenticate`
- `requireWritePermission([MODULES.USER])` → Check write permission
- `enforceEntityAccessQuery("entity_id")` → Validate entity access
- `validate(createUserSchema)`

**Business Logic**:
- Validates entity_id is accessible
- Checks email/mobile uniqueness
- Hashes password with salt
- Creates user record

---

### Meter Endpoints

#### `GET /api/meters`
**Purpose**: List meters (filtered by accessible hierarchy)

**Query Params**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)
- `entityId` (optional): Filter by entity ID

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.METER])` → Check read permission
3. `validateQuery(meterListQuerySchema)` → Validate query parameters
4. `enforceEntityAccessQuery("entityId")` → Validate entity access
5. Controller → Service → Repository

**Example Request**:
```bash
GET /api/meters?page=1&limit=10
GET /api/meters?page=1&limit=10&entityId=entity-uuid
```

**Response**:
```json
{
  "success": true,
  "message": "Meters listed successfully",
  "data": [
    {
      "id": "meter-uuid",
      "name": "Production Line A",
      "meterType": "PHYSICAL",
      "entityId": "entity-uuid",
      "attributes": {
        "location": "Building 1"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/meters"
}
```

#### `GET /api/meters/:id`
**Purpose**: Get meter by ID (validates entity access)

**Flow**:
1. `authenticate` → Verify JWT
2. Service validates meter's entity is accessible
3. Returns meter

#### `POST /api/meters`
**Purpose**: Create meter (validates entity access)

**Request**:
```json
{
  "entityId": "consumer-entity-uuid",
  "name": "Production Line A",
  "meterType": "PHYSICAL",
  "attributes": {
    "location": "Building 1"
  }
}
```

**Middleware**:
- `authenticate`
- `requireWritePermission([MODULES.METER])` → Check write permission
- `enforceEntityAccessQuery("entityId")` → Validate entity access
- `validate(createMeterSchema)`

---

### Profile Endpoints ⭐ NEW

#### `GET /api/profiles`
**Purpose**: List profiles based on access level

**Query Parameters**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)
- `entityId` (optional): Filter by entity ID. Use `null` to get global profiles

**Access Control**:
- **Root Admin**: Can see all profiles (global + entity-scoped)
- **Entity Admin**: Can see global profiles + profiles for accessible entities

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.PROFILE])` → Check read permission
3. `validateQuery(profileListQuerySchema)` → Validate query parameters
4. `enforceEntityAccessQuery("entityId")` → Validate entity access
5. Controller → Service → Repository

**Examples**:
```bash
# Get all accessible profiles
GET /api/profiles?page=1&limit=10

# Get global profiles only (root admin only)
GET /api/profiles?page=1&limit=10&entityId=null

# Get profiles for specific entity
GET /api/profiles?page=1&limit=10&entityId=entity-uuid
```

**Response**:
```json
{
  "success": true,
  "message": "Profiles listed",
  "data": [
    {
      "id": "profile-uuid",
      "name": "Tenant",
      "entity_id": null,
      "attributes": {},
      "created_by": "admin-uuid",
      "creation_time": "2024-01-01T00:00:00Z",
      "last_update_on": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/profiles"
}
```

#### `GET /api/profiles/:id`
**Purpose**: Get profile by ID

**Access Control**:
- Global profiles (`entity_id = null`): Root Admin only
- Entity-scoped profiles: User must have access to the profile's entity

#### `POST /api/profiles`
**Purpose**: Create profile

**Request**:
```json
{
  "name": "Custom Tenant Profile",
  "entity_id": "tenant-entity-uuid",  // null for global profile
  "attributes": {
    "description": "Custom profile for specific tenant"
  }
}
```

**Access Control**:
- Global profiles: Root Admin only
- Entity-scoped profiles: Root Admin or Entity Admin (must validate entity access)

**Middleware**:
- `authenticate`
- `requireWritePermission([MODULES.PROFILE])` → Check write permission
- `enforceEntityAccessQuery("entity_id")` → Validate entity access if provided
- `validate(createProfileSchema)`

#### `PATCH /api/profiles/:id`
**Purpose**: Update profile (same access rules as GET)

**Request**:
```json
{
  "name": "Updated Profile Name",
  "attributes": {
    "description": "Updated description"
  }
}
```

#### `DELETE /api/profiles/:id`
**Purpose**: Delete profile (same access rules as GET)

---

### Role Endpoints

#### `GET /api/roles`
**Purpose**: List roles (filtered by accessible hierarchy)

**Query Params**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)
- `entityId` (optional): Filter by entity ID. Use `null` to get global roles

**Access Control**:
- **Root Admin**: Can see all roles (global + entity-scoped)
- **Entity Admin**: Can see global roles + roles for accessible entities

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.ROLE])` → Check read permission
3. `validateQuery(roleListQuerySchema)` → Validate query parameters
4. `enforceEntityAccessQuery("entityId")` → Validate entity access
5. Controller → Service → Repository

**Example Request**:
```bash
GET /api/roles?page=1&limit=10
GET /api/roles?page=1&limit=10&entityId=null
GET /api/roles?page=1&limit=10&entityId=entity-uuid
```

**Response**:
```json
{
  "success": true,
  "message": "Roles listed",
  "data": [
    {
      "id": "role-uuid",
      "name": "Tenant Admin",
      "entity_id": "entity-uuid",
      "attributes": {
        "permissions": [
          {
            "moduleId": "module-uuid",
            "name": "Entity",
            "read": true,
            "write": true
          }
        ]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/roles"
}
```

---

### Module Endpoints ⭐ NEW

#### `GET /api/modules`
**Purpose**: List all system modules (Root Admin only)

**Query Params**:
- `page` (required): Page number (minimum: 1)
- `limit` (required): Items per page (minimum: 1, maximum: 100)

**Access Control**: Root Admin only (modules define system capabilities)

**Middleware Chain**:
1. `authenticate` → Verify JWT
2. `requireReadPermission([MODULES.MODULE])` → Check read permission
3. `validateQuery(moduleListQuerySchema)` → Validate query parameters
4. Controller → Service → Repository

**Example Request**:
```bash
GET /api/modules?page=1&limit=10
```

**Response**:
```json
{
  "success": true,
  "message": "Modules listed",
  "data": [
    {
      "id": "module-uuid",
      "name": "Entity",
      "created_by": "admin-uuid",
      "creation_time": "2024-01-01T00:00:00Z",
      "last_update_on": "2024-01-01T00:00:00Z"
    },
    {
      "id": "module-uuid-2",
      "name": "User",
      "created_by": "admin-uuid",
      "creation_time": "2024-01-01T00:00:00Z",
      "last_update_on": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 6,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "timestamp": 1234567890,
  "path": "/api/modules"
}
```

#### `GET /api/modules/:id`
**Purpose**: Get module by ID (Root Admin only)

**Access Control**: Root Admin only

#### `POST /api/modules`
**Purpose**: Create new module (Root Admin only)

**Request**:
```json
{
  "name": "Report"
}
```

**Business Rules**:
- Module names must be unique
- Only root admin can create modules
- Modules are system-wide (no entity_id field)

**Middleware**:
- `authenticate`
- `requireWritePermission([MODULES.MODULE])` → Check write permission
- `validate(createModuleSchema)`

**Note**: Service layer enforces root admin check (throws 403 if not root admin)

#### `PATCH /api/modules/:id`
**Purpose**: Update module (Root Admin only)

**Request**:
```json
{
  "name": "Updated Module Name"
}
```

#### `DELETE /api/modules/:id`
**Purpose**: Delete module (Root Admin only)

**Warning**: Be careful when deleting modules as they may be referenced in role permissions.

---

## Access Control Matrix ⭐ NEW

| Resource | Global Access | Entity-Scoped Access | Who Can Manage |
|----------|--------------|---------------------|----------------|
| **Modules** | Always | N/A (no entity_id) | Root Admin Only |
| **Global Profiles** | Always | N/A (entity_id = null) | Root Admin Only |
| **Entity Profiles** | Inherit from entity | Yes | Root Admin + Entity Admin |
| **Global Roles** | Always | N/A (entity_id = null) | Root Admin Only |
| **Entity Roles** | Inherit from entity | Yes | Root Admin + Entity Admin |
| **Entities** | N/A | Yes (hierarchy) | Root Admin + Entity Admin (own hierarchy) |
| **Users** | N/A | Yes (hierarchy) | Root Admin + Entity Admin (own hierarchy) |
| **Meters** | N/A | Yes (hierarchy) | Root Admin + Entity Admin (own hierarchy) |

**Note**: "Root Admin" = User whose entity has `entity_id = null` (no parent)

---

## Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm >= 9.0.0

### Install Dependencies
```bash
npm install
```

### Environment Configuration
Create `.env` file:
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=smart_meter_dev

# Server
NODE_ENV=development
PORT=3000

# JWT Authentication
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Database Migrations
```bash
npm run db:migrate      # Run migrations
npm run db:migrate:undo # Undo last migration
npm run db:seed         # Run seeders
```

---

## Key Features

✅ **Hierarchy Isolation** - Complete tenant-based data isolation
✅ **Multi-Level Security** - Authentication → Authorization → Hierarchy Validation
✅ **Role-Based Access Control** - Module-level permissions
✅ **Type Safety** - Full TypeScript coverage
✅ **Input Validation** - Joi schema validation
✅ **SQL Injection Prevention** - Sequelize ORM with parameterized queries
✅ **Password Security** - bcryptjs hashing with salt
✅ **Error Handling** - Consistent error responses
✅ **Logging** - Winston logger with file output
✅ **Performance** - Connection pooling, query optimization

---

## Development Best Practices

1. **Type Safety** - All code is TypeScript with strict mode
2. **DRY Principle** - Base classes and utilities for reusability
3. **Error Handling** - Try-catch with proper error mapping
4. **Logging** - Structured logging with Winston
5. **Validation** - Request validation with Joi schemas
6. **Separation of Concerns** - Clear layer separation
7. **Database** - Use Sequelize ORM for all queries
8. **Migrations** - Use migration files for schema changes
9. **Security First** - Validate at multiple layers
10. **Hierarchy Awareness** - Always validate entity access

---

## Security Checklist

✅ Password hashing with bcryptjs (10 rounds + salt)
✅ JWT token validation on protected routes
✅ Role-based access control (RBAC)
✅ Input validation with Joi schemas
✅ Helmet for HTTP headers
✅ CORS configuration
✅ SQL injection prevention via Sequelize ORM
✅ **Hierarchy-based data isolation** ⭐ NEW
✅ Error handling without sensitive data leakage
✅ Request logging and monitoring

---

## Performance Optimization

- Connection pooling (max 20 connections)
- Query optimization with Sequelize
- Indexes on FK columns
- Pagination support on list endpoints
- Recursive CTE for hierarchy queries (efficient)
- Lazy loading with associations
- Hierarchy-scoped queries (only accessible entities)

---

## Troubleshooting

### Common Issues

**Issue**: Getting 403 "Access denied to entity outside your hierarchy"
- **Cause**: Trying to access entity not in your hierarchy
- **Solution**: Check entity hierarchy relationships

**Issue**: Cannot create child entity
- **Cause**: Parent entity not accessible
- **Solution**: Ensure parent entity is in your accessible hierarchy

**Issue**: JWT token invalid
- **Cause**: Token expired or invalid secret
- **Solution**: Login again to get new token

---

## License

Proprietary - All rights reserved
# kimbal-meter-data
