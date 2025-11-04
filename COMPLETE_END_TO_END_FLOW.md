# 🎯 Complete End-to-End Flow: From Database Setup to Consumer Meters

## 📋 Document Purpose

This document shows the **complete flow** from initial database setup to a consumer viewing meters, with:
- ✅ What needs manual DB setup
- ✅ What happens via API
- ✅ What the frontend user sees/does
- ✅ What API calls are made
- ✅ Complete automation path

**Everything in one place!** No confusion.

---

## 🗂️ Table of Contents

1. [Phase 0: Manual Database Setup](#phase-0-manual-database-setup)
2. [Phase 1: Root Admin Initial Setup](#phase-1-root-admin-initial-setup)
3. [Phase 2: Tenant Creation Flow](#phase-2-tenant-creation-flow)
4. [Phase 3: Customer Creation Flow](#phase-3-customer-creation-flow)
5. [Phase 4: Consumer Creation Flow](#phase-4-consumer-creation-flow)
6. [Phase 5: Meter Creation & Viewing](#phase-5-meter-creation--viewing)

---

## 🔴 Phase 0: Manual Database Setup (One-Time)

### **Why Manual?**
No users exist yet, so no one can authenticate API calls. These 3 things must be inserted directly into the database.

---

### **Step 0.1: Create Admin Profile (Manual SQL)**

**What:** Create the Admin profile that will be used by the root entity.

**Database Insert:**
```sql
INSERT INTO profiles (
    id,
    name,
    entity_id,  -- NULL = global profile
    attributes,
    created_by,
    creation_time,
    last_update_on
) VALUES (
    gen_random_uuid(),  -- Example: 71cc1c9e-802d-42ba-9820-a7f68142fcfe
    'Admin',
    NULL,  -- Global profile
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

**Result:** Admin Profile created with ID (save this!)

---

### **Step 0.2: Create Root Entity (Manual SQL)**

**What:** Create the top-level entity (ETL Admin) that has no parent.

**Database Insert:**
```sql
INSERT INTO entities (
    id,
    entity_id,  -- NULL = root level (no parent)
    name,
    email_id,
    mobile_no,
    profile_id,  -- Use Admin Profile ID from Step 0.1
    attributes,
    created_by,
    creation_time,
    last_update_on
) VALUES (
    gen_random_uuid(),  -- Example: d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca
    NULL,  -- Root has no parent
    'ETL Admin',
    'admin@etlab.co',
    '9971318881',
    '71cc1c9e-802d-42ba-9820-a7f68142fcfe',  -- Admin Profile ID from Step 0.1
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

**Result:** Root Entity created (save this ID!)

---

### **Step 0.3: Create Root Admin User (Manual SQL)**

**What:** Create the first user who can login and use the API.

**Important:** You need to hash the password first using your app's crypto utility.

**Generate Password Hash:**
```javascript
// Use your app's CryptoUtil
const salt = CryptoUtil.generateSalt();
const hash = CryptoUtil.hashPassword('Abc@123', salt);
// Result: hash = "3FgAgqATH53jyM3K8ljs/IMBnRaA6m7TICjTEI+JM+A="
//         salt = "b3sGTt3YUavvSzAzxBK0iA=="
```

**Database Insert:**
```sql
INSERT INTO users (
    id,
    entity_id,  -- Root Entity ID from Step 0.2
    email,
    mobile_no,
    name,
    password_hash,
    salt,
    is_active,
    is_deleted,
    attributes,
    created_by,
    creation_time,
    last_update_on,
    role_id  -- NULL for now, will assign via API
) VALUES (
    gen_random_uuid(),  -- Example: a2fe23e3-a1a3-4954-9d12-d6e7987bbe63
    'd2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca',  -- Root Entity ID
    'ritik.gupta@etlab.co',
    '9938830249',
    'Ritik Gupta',
    '3FgAgqATH53jyM3K8ljs/IMBnRaA6m7TICjTEI+JM+A=',  -- Hashed password
    'b3sGTt3YUavvSzAzxBK0iA==',  -- Salt
    true,
    false,
    '{"password":"Abc@123"}',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    NULL  -- No role yet (will assign via API)
);
```

**Result:** Root Admin User created!

---

## ✅ After Phase 0: What Exists

```
✅ Admin Profile (global)
✅ Root Entity (ETL Admin)
✅ Root Admin User (can login)
```

**Now the API can be used!** The first user exists and can authenticate.

---

## 🎬 Phase 1: Root Admin Initial Setup (Via API)

### **Who:** Root Admin User (ritik.gupta@etlab.co)

---

### **Step 1.1: Login (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Smart Meter Backend System          │
│                                       │
│  Email: [ritik.gupta@etlab.co]       │
│  Password: [Abc@123        ]         │
│                                       │
│           [ Login ]                   │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
    "email": "ritik.gupta@etlab.co",
    "password": "Abc@123"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "a2fe23e3-a1a3-4954-9d12-d6e7987bbe63",
            "email": "ritik.gupta@etlab.co",
            "entityId": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca",
            "roleId": null  -- No role yet!
        }
    }
}
```

**Frontend Action:**
- Save token in localStorage/sessionStorage
- Redirect to Dashboard
- Show message: "Login successful, but you need to set up modules first"

**State After:**
```
✅ User logged in
✅ Token received
⚠️ No role assigned (no permissions yet)
```

---

### **Step 1.2: Create Modules (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  System Setup                        │
│                                       │
│  Welcome! Let's set up your system.  │
│                                       │
│  Step 1: Create System Modules       │
│                                       │
│  Modules to Create:                   │
│  ├─ [✓] Entity                       │
│  ├─ [✓] Module                       │
│  ├─ [✓] Profile                      │
│  ├─ [✓] Role                         │
│  ├─ [✓] User                         │
│  └─ [✓] Meter                        │
│                                       │
│     [Create All Modules]              │
└─────────────────────────────────────┘
```

**API Calls (6 requests in sequence):**

**1. Create Entity Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "Entity"
}
```
**Response:** `{ "id": "d3f32d83-c2f9-4336-b570-38535d026e83" }`
**Frontend:** Save as `moduleEntityId`

**2. Create Module Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "Module"
}
```
**Response:** `{ "id": "9bd63776-de25-4c89-9166-888002962ba6" }`
**Frontend:** Save as `moduleModuleId`

**3. Create Profile Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "Profile"
}
```
**Response:** `{ "id": "99b441c0-8c46-4a46-b21e-e83188b762e6" }`
**Frontend:** Save as `moduleProfileId`

**4. Create Role Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "Role"
}
```
**Response:** `{ "id": "4a3ce07e-c028-4801-827b-15a62a190f45" }`
**Frontend:** Save as `moduleRoleId`

**5. Create User Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "User"
}
```
**Response:** `{ "id": "30e0af16-d582-4003-95e6-ebeb0dd756e9" }`
**Frontend:** Save as `moduleUserId`

**6. Create Meter Module:**
```http
POST {{base_url}}/api/modules
Authorization: Bearer {{token}}

{
    "name": "Meter"
}
```
**Response:** `{ "id": "xxx-xxx-xxx" }`
**Frontend:** Save as `moduleMeterId`

**Frontend Action:**
- Show progress: "Creating modules... 6/6"
- Show success: "All modules created!"
- Enable next step

**State After:**
```
✅ 6 modules created
✅ All module IDs saved
✅ Can now create roles with permissions
```

---

### **Step 1.3: Create Admin Role (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Admin Role                   │
│                                       │
│  Role Name: [Admin            ]      │
│  Scope: [● Global]                    │
│        [○ Entity-Scoped]             │
│                                       │
│  Permissions:                         │
│  ├─ Entity:     [✓ Read] [✓ Write]   │
│  ├─ Module:     [✓ Read] [✓ Write]   │
│  ├─ Profile:     [✓ Read] [✓ Write]   │
│  ├─ Role:        [✓ Read] [✓ Write]   │
│  ├─ User:        [✓ Read] [✓ Write]   │
│  └─ Meter:       [✓ Read] [✓ Write]   │
│                                       │
│        [Cancel]  [Create Role]        │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/roles
Authorization: Bearer {{token}}

{
    "name": "Admin",
    "entityId": null,  -- Global role
    "permissions": [
        {
            "moduleId": "d3f32d83-c2f9-4336-b570-38535d026e83",
            "name": "Entity",
            "read": true,
            "write": true
        },
        {
            "moduleId": "9bd63776-de25-4c89-9166-888002962ba6",
            "name": "Module",
            "read": true,
            "write": true
        },
        {
            "moduleId": "99b441c0-8c46-4a46-b21e-e83188b762e6",
            "name": "Profile",
            "read": true,
            "write": true
        },
        {
            "moduleId": "4a3ce07e-c028-4801-827b-15a62a190f45",
            "name": "Role",
            "read": true,
            "write": true
        },
        {
            "moduleId": "30e0af16-d582-4003-95e6-ebeb0dd756e9",
            "name": "User",
            "read": true,
            "write": true
        },
        {
            "moduleId": "{{moduleMeterId}}",
            "name": "Meter",
            "read": true,
            "write": true
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "1332b0e1-0240-4392-891e-1a72c5e0566f",
        "name": "Admin",
        "entity_id": null,
        "attributes": {
            "roles": [...]
        }
    }
}
```

**Frontend Action:**
- Save role ID: `adminRoleId = 1332b0e1-0240-4392-891e-1a72c5e0566f`
- Show success: "Admin role created!"
- Automatically proceed to assign role to user

**State After:**
```
✅ Admin Role created
✅ Global role (entity_id = null)
✅ Has all permissions
```

---

### **Step 1.4: Assign Admin Role to Current User (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Assign Role to Your Account         │
│                                       │
│  You need a role to access features. │
│                                       │
│  Assign "Admin" role to yourself?    │
│                                       │
│           [Yes, Assign Role]          │
└─────────────────────────────────────┘
```

**API Call:**
```http
PATCH {{base_url}}/api/users/a2fe23e3-a1a3-4954-9d12-d6e7987bbe63
Authorization: Bearer {{token}}

{
    "role_id": "1332b0e1-0240-4392-891e-1a72c5e0566f"
}
```

**Note:** If update endpoint doesn't support role_id, you might need to:
```http
PATCH {{base_url}}/api/users/a2fe23e3-a1a3-4954-9d12-d6e7987bbe63
Authorization: Bearer {{token}}

{
    "role_id": "1332b0e1-0240-4392-891e-1a72c5e0566f"
}
```

**Or via SQL:**
```sql
UPDATE users 
SET role_id = '1332b0e1-0240-4392-891e-1a72c5e0566f'
WHERE email = 'ritik.gupta@etlab.co';
```

**Frontend Action:**
- Show success: "Admin role assigned!"
- Refresh user context (token still valid, but now includes permissions)
- Redirect to main dashboard

**State After:**
```
✅ Root Admin User has Admin role
✅ Full permissions enabled
✅ Can now manage entire system
```

---

### **Step 1.5: View Dashboard (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────────────────┐
│  Dashboard - ETL Admin                          │
│                                                  │
│  Welcome, Ritik Gupta!                          │
│                                                  │
│  Quick Actions:                                  │
│  ├─ [Create Tenant]                             │
│  ├─ [Create Profile]                             │
│  ├─ [View Entities]                             │
│  └─ [Manage Modules]                             │
│                                                  │
│  System Overview:                                │
│  ├─ Modules: 6/6 ✅                             │
│  ├─ Roles: 1 (Admin)                            │
│  ├─ Entities: 1 (Root only)                    │
│  └─ Users: 1 (You)                              │
└─────────────────────────────────────────────────┘
```

**API Call (Optional - to verify):**
```http
GET {{base_url}}/api/entities
Authorization: Bearer {{token}}
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca",
            "name": "ETL Admin",
            "entity_id": null
        }
    ]
}
```

---

## 🏢 Phase 2: Tenant Creation Flow

### **Who:** Root Admin (ritik.gupta@etlab.co)

---

### **Step 2.1: Navigate to Create Tenant (Frontend)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Entities Management                 │
│                                       │
│  Current Entities:                    │
│  └─ 📁 ETL Admin (Root)              │
│                                       │
│  Actions:                             │
│  ├─ [Create Tenant]                   │
│  ├─ [View Hierarchy]                  │
│  └─ [View Details]                    │
└─────────────────────────────────────┘
```

**User clicks:** "Create Tenant"

---

### **Step 2.2: Create Tenant Profile (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Tenant Profile                │
│                                       │
│  Profile Name: [Tenant         ]      │
│  Scope: [○ Global]                    │
│        [● Entity-Scoped]              │
│  Entity: [ETL Admin ▼]               │
│                                       │
│        [Cancel]  [Create Profile]     │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/profiles
Authorization: Bearer {{token}}

{
    "name": "Tenant",
    "entity_id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca",  -- Root entity
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "360cb945-44ba-4fc6-a52a-54423ca19f68",
        "name": "Tenant",
        "entity_id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca"
    }
}
```

**Frontend Action:**
- Save profile ID: `tenantProfileId = 360cb945-44ba-4fc6-a52a-54423ca19f68`
- Show: "Tenant profile created!"
- Proceed to create tenant entity

---

### **Step 2.3: Create Tenant Entity (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Tenant Entity                │
│                                       │
│  Name: [KMP Energy            ]      │
│  Email: [admin@kmp.com        ]      │
│  Mobile: [8888888888          ]      │
│  Parent: [ETL Admin ▼] (root)       │
│  Profile: [Tenant ▼]                 │
│                                       │
│        [Cancel]  [Create Tenant]     │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/entities
Authorization: Bearer {{token}}

{
    "name": "KMP Energy",
    "email_id": "admin@kmp.com",
    "mobile_no": "8888888888",
    "profile_id": "360cb945-44ba-4fc6-a52a-54423ca19f68",  -- Tenant Profile
    "entity_id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca",  -- Root Entity (parent)
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",
        "name": "KMP Energy",
        "entity_id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca",
        "profile_id": "360cb945-44ba-4fc6-a52a-54423ca19f68"
    }
}
```

**Frontend Action:**
- Save entity ID: `tenantEntityId = 6648975a-d7ce-41bd-aeb6-47e905b5232f`
- Show: "Tenant 'KMP Energy' created!"
- Show prompt: "Create admin user for this tenant?"

---

### **Step 2.4: Create Tenant Admin Role (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Tenant Admin Role            │
│                                       │
│  Role Name: [Tenant Admin     ]      │
│  Scope: [○ Global]                    │
│        [● Entity-Scoped]              │
│  Entity: [KMP Energy ▼]               │
│                                       │
│  Permissions:                         │
│  ├─ Entity:     [✓ Read] [✓ Write]   │
│  ├─ Profile:     [✓ Read] [✓ Write]   │
│  ├─ Role:        [✓ Read] [✓ Write]   │
│  └─ User:        [✓ Read] [✓ Write]   │
│                                       │
│        [Cancel]  [Create Role]        │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/roles
Authorization: Bearer {{token}}

{
    "name": "Tenant Admin",
    "entityId": "6648975a-d7ce-41bd-aeb6-47e905b5232f",  -- Tenant entity
    "permissions": [
        {
            "moduleId": "d3f32d83-c2f9-4336-b570-38535d026e83",
            "name": "Entity",
            "read": true,
            "write": true
        },
        {
            "moduleId": "99b441c0-8c46-4a46-b21e-e83188b762e6",
            "name": "Profile",
            "read": true,
            "write": true
        },
        {
            "moduleId": "4a3ce07e-c028-4801-827b-15a62a190f45",
            "name": "Role",
            "read": true,
            "write": true
        },
        {
            "moduleId": "30e0af16-d582-4003-95e6-ebeb0dd756e9",
            "name": "User",
            "read": true,
            "write": true
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "5b948561-2322-45e5-99ba-a317ffe05198",
        "name": "Tenant Admin",
        "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"
    }
}
```

**Frontend Action:**
- Save role ID: `tenantAdminRoleId = 5b948561-2322-45e5-99ba-a317ffe05198`
- Proceed to create tenant admin user

---

### **Step 2.5: Create Tenant Admin User (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Tenant Admin User            │
│                                       │
│  Email: [admin@kmp.in         ]      │
│  Name: [KMP Admin            ]       │
│  Mobile: [9999999999         ]      │
│  Password: [KMPAdmin@123      ]      │
│  Confirm: [KMPAdmin@123      ]      │
│  Entity: [KMP Energy ▼]              │
│  Role: [Tenant Admin ▼]               │
│                                       │
│        [Cancel]  [Create User]        │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/users
Authorization: Bearer {{token}}

{
    "email": "admin@kmp.in",
    "password": "KMPAdmin@123",
    "name": "KMP Admin",
    "mobile_no": "9999999999",
    "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",  -- Tenant entity
    "role_id": "5b948561-2322-45e5-99ba-a317ffe05198"  -- Tenant Admin role
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "tenant-user-001",
        "email": "admin@kmp.in",
        "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",
        "role_id": "5b948561-2322-45e5-99ba-a317ffe05198"
    }
}
```

**Frontend Action:**
- Show success: "Tenant admin user created!"
- Show: "Tenant setup complete! Tenant admin can now login."
- Option to: "Login as tenant admin" or "Continue as root admin"

**State After:**
```
✅ Tenant Profile created (entity-scoped)
✅ Tenant Entity created (KMP Energy)
✅ Tenant Admin Role created
✅ Tenant Admin User created
✅ Tenant admin can now login and manage tenant hierarchy
```

---

## 🏭 Phase 3: Customer Creation Flow

### **Who:** Tenant Admin (admin@kmp.in) OR Root Admin

---

### **Step 3.1: Login as Tenant Admin (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Smart Meter Backend System          │
│                                       │
│  Email: [admin@kmp.in         ]      │
│  Password: [KMPAdmin@123      ]      │
│                                       │
│           [ Login ]                   │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/auth/login

{
    "email": "admin@kmp.in",
    "password": "KMPAdmin@123"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "tenant-user-001",
            "entityId": "6648975a-d7ce-41bd-aeb6-47e905b5232f",  -- Tenant entity
            "roleId": "5b948561-2322-45e5-99ba-a317ffe05198"
        }
    }
}
```

**Frontend Action:**
- Save token: `tenantToken`
- Show dashboard with tenant scope
- User sees: "KMP Energy" tenant view

---

### **Step 3.2: Navigate to Create Customer (Frontend)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Dashboard - KMP Energy              │
│                                       │
│  Entity: KMP Energy (Tenant)          │
│                                       │
│  Quick Actions:                       │
│  ├─ [Create Customer]                 │
│  ├─ [View Customers]                 │
│  └─ [Manage Users]                   │
│                                       │
│  Hierarchy:                           │
│  └─ KMP Energy                        │
│     └─ (No customers yet)            │
└─────────────────────────────────────┘
```

**User clicks:** "Create Customer"

---

### **Step 3.3: Create Customer Profile (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Customer Profile             │
│                                       │
│  Profile Name: [Customer      ]      │
│  Scope: [● Entity-Scoped]            │
│  Entity: [KMP Energy ▼]               │
│                                       │
│        [Cancel]  [Create Profile]     │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/profiles
Authorization: Bearer {{tenantToken}}

{
    "name": "Customer",
    "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",  -- Tenant entity
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "16feb263-337a-4073-a35a-79d4fb1e9ce7",
        "name": "Customer",
        "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"
    }
}
```

**Frontend Action:**
- Save profile ID: `customerProfileId = 16feb263-337a-4073-a35a-79d4fb1e9ce7`

---

### **Step 3.4: Create Customer Entity (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Customer Entity               │
│                                       │
│  Name: [Ideal Energy          ]      │
│  Email: [info@idealenergy.co  ]      │
│  Mobile: [9999999999          ]      │
│  Parent: [KMP Energy ▼]              │
│  Profile: [Customer ▼]                │
│                                       │
│        [Cancel]  [Create Customer]   │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/entities
Authorization: Bearer {{tenantToken}}

{
    "name": "Ideal Energy",
    "email_id": "info@idealenergy.co",
    "mobile_no": "9999999999",
    "profile_id": "16feb263-337a-4073-a35a-79d4fb1e9ce7",  -- Customer Profile
    "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",  -- Tenant Entity (parent)
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",
        "name": "Ideal Energy",
        "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"
    }
}
```

**Frontend Action:**
- Save entity ID: `customerEntityId = 5564b446-5b2a-4a2b-becc-d0cef79d2435`
- Show: "Customer 'Ideal Energy' created!"

---

### **Step 3.5: Create Customer Admin Role (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Customer Admin Role          │
│                                       │
│  Role Name: [Customer Admin  ]      │
│  Entity: [Ideal Energy ▼]           │
│                                       │
│  Permissions:                         │
│  ├─ Entity:     [✓ Read] [✓ Write]   │
│  ├─ Profile:     [✓ Read] [✓ Write]   │
│  ├─ Role:        [✓ Read] [✓ Write]   │
│  └─ User:        [✓ Read] [✓ Write]   │
│                                       │
│        [Cancel]  [Create Role]       │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/roles
Authorization: Bearer {{tenantToken}}

{
    "name": "Customer Admin",
    "entityId": "5564b446-5b2a-4a2b-becc-d0cef79d2435",  -- Customer entity
    "permissions": [
        {
            "moduleId": "d3f32d83-c2f9-4336-b570-38535d026e83",
            "name": "Entity",
            "read": true,
            "write": true
        },
        {
            "moduleId": "99b441c0-8c46-4a46-b21e-e83188b762e6",
            "name": "Profile",
            "read": true,
            "write": true
        },
        {
            "moduleId": "4a3ce07e-c028-4801-827b-15a62a190f45",
            "name": "Role",
            "read": true,
            "write": true
        },
        {
            "moduleId": "30e0af16-d582-4003-95e6-ebeb0dd756e9",
            "name": "User",
            "read": true,
            "write": true
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "fcf40311-8151-421c-a6e1-02865375f237",
        "name": "Customer Admin",
        "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
    }
}
```

**Frontend Action:**
- Save role ID: `customerAdminRoleId = fcf40311-8151-421c-a6e1-02865375f237`

---

### **Step 3.6: Create Customer Admin User (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Customer Admin User          │
│                                       │
│  Email: [admin@idealenergy.co]       │
│  Name: [Ideal Admin         ]        │
│  Mobile: [7777777777         ]      │
│  Password: [IdealAdmin@123   ]      │
│  Entity: [Ideal Energy ▼]            │
│  Role: [Customer Admin ▼]            │
│                                       │
│        [Cancel]  [Create User]       │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/users
Authorization: Bearer {{tenantToken}}

{
    "email": "admin@idealenergy.co",
    "password": "IdealAdmin@123",
    "name": "Ideal Admin",
    "mobile_no": "7777777777",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",  -- Customer entity
    "role_id": "fcf40311-8151-421c-a6e1-02865375f237"  -- Customer Admin role
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "customer-user-001",
        "email": "admin@idealenergy.co"
    }
}
```

**Frontend Action:**
- Show success: "Customer admin created!"
- Show: "Customer setup complete!"

**State After:**
```
✅ Customer Profile created (entity-scoped to tenant)
✅ Customer Entity created (Ideal Energy)
✅ Customer Admin Role created
✅ Customer Admin User created
```

---

## 🏠 Phase 4: Consumer Creation Flow

### **Who:** Customer Admin (admin@idealenergy.co) OR Tenant Admin OR Root Admin

---

### **Step 4.1: Login as Customer Admin (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Smart Meter Backend System          │
│                                       │
│  Email: [admin@idealenergy.co]       │
│  Password: [IdealAdmin@123    ]      │
│                                       │
│           [ Login ]                   │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/auth/login

{
    "email": "admin@idealenergy.co",
    "password": "IdealAdmin@123"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "id": "customer-user-001",
            "entityId": "5564b446-5b2a-4a2b-becc-d0cef79d2435",  -- Customer entity
            "roleId": "fcf40311-8151-421c-a6e1-02865375f237"
        }
    }
}
```

**Frontend Action:**
- Save token: `customerToken`
- Show customer dashboard

---

### **Step 4.2: Create Consumer Profile (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Consumer Profile              │
│                                       │
│  Profile Name: [Consumer      ]      │
│  Scope: [● Entity-Scoped]             │
│  Entity: [Ideal Energy ▼]            │
│                                       │
│        [Cancel]  [Create Profile]     │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/profiles
Authorization: Bearer {{customerToken}}

{
    "name": "Consumer",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",  -- Customer entity
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "d1478966-5b9a-4878-a586-6c241c3f9603",
        "name": "Consumer",
        "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
    }
}
```

**Frontend Action:**
- Save profile ID: `consumerProfileId = d1478966-5b9a-4878-a586-6c241c3f9603`

---

### **Step 4.3: Create Consumer Entity (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Consumer Entity              │
│                                       │
│  Name: [Patanjali Industries ]       │
│  Email: [info@patanjali.com  ]      │
│  Mobile: [6666666666          ]      │
│  Parent: [Ideal Energy ▼]           │
│  Profile: [Consumer ▼]                │
│                                       │
│        [Cancel]  [Create Consumer]   │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/entities
Authorization: Bearer {{customerToken}}

{
    "name": "Patanjali Industries",
    "email_id": "info@patanjali.com",
    "mobile_no": "6666666666",
    "profile_id": "d1478966-5b9a-4878-a586-6c241c3f9603",  -- Consumer Profile
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",  -- Customer Entity (parent)
    "attributes": null
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",
        "name": "Patanjali Industries",
        "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
    }
}
```

**Frontend Action:**
- Save entity ID: `consumerEntityId = f1886b9f-0e81-4282-b87e-3cc742a2c2e5`

---

### **Step 4.4: Create Consumer Role (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Consumer Role                │
│                                       │
│  Role Name: [Consumer Role    ]      │
│  Entity: [Patanjali Industries ▼]   │
│                                       │
│  Permissions:                         │
│  └─ Meter:       [✓ Read] [✗ Write] │
│                                       │
│        [Cancel]  [Create Role]       │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/roles
Authorization: Bearer {{customerToken}}

{
    "name": "Consumer Role",
    "entityId": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",  -- Consumer entity
    "permissions": [
        {
            "moduleId": "{{moduleMeterId}}",
            "name": "Meter",
            "read": true,
            "write": false  -- Read-only for consumers
        }
    ]
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "consumer-role-001",
        "name": "Consumer Role",
        "entity_id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5"
    }
}
```

**Frontend Action:**
- Save role ID: `consumerRoleId = consumer-role-001`

---

### **Step 4.5: Create Consumer User (Frontend → API)**

**Frontend Screen:**
```
┌─────────────────────────────────────┐
│  Create Consumer User                │
│                                       │
│  Email: [consumer@patanjali.com]     │
│  Name: [Patanjali Consumer  ]       │
│  Mobile: [8888888888         ]      │
│  Password: [Consumer@123      ]      │
│  Entity: [Patanjali Industries ▼]    │
│  Role: [Consumer Role ▼]             │
│                                       │
│        [Cancel]  [Create User]       │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/users
Authorization: Bearer {{customerToken}}

{
    "email": "consumer@patanjali.com",
    "password": "Consumer@123",
    "name": "Patanjali Consumer",
    "mobile_no": "8888888888",
    "entity_id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",  -- Consumer entity
    "role_id": "consumer-role-001"  -- Consumer role
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "consumer-user-001",
        "email": "consumer@patanjali.com"
    }
}
```

**Frontend Action:**
- Show success: "Consumer user created!"
- Show: "Consumer can now login and view meters"

**State After:**
```
✅ Consumer Profile created
✅ Consumer Entity created (Patanjali Industries)
✅ Consumer Role created (read-only meters)
✅ Consumer User created
```

---

## 🔌 Phase 5: Meter Creation & Viewing

### **Who:** Customer Admin OR Tenant Admin OR Root Admin (creates meters)
### **Who:** Consumer (views meters)

---

### **Step 5.1: Create Meter (Customer Admin → API)**

**Frontend Screen (Customer Admin):**
```
┌─────────────────────────────────────┐
│  Create Meter                         │
│                                       │
│  Entity: [Patanjali Industries ▼]    │
│  Name: [Production Line A Meter]     │
│  Type: [● Physical]                   │
│        [○ Virtual]                    │
│        [○ Group]                     │
│                                       │
│  Location: [Building 1        ]      │
│  Manufacturer: [Schneider Electric]  │
│                                       │
│        [Cancel]  [Create Meter]       │
└─────────────────────────────────────┘
```

**API Call:**
```http
POST {{base_url}}/api/meters
Authorization: Bearer {{customerToken}}

{
    "entityId": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",  -- Consumer entity
    "name": "Production Line A Meter",
    "meterType": "PHYSICAL",
    "attributes": {
        "location": "Building 1",
        "manufacturer": "Schneider Electric",
        "model": "SE-001"
    }
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "id": "meter-physical-001",
        "name": "Production Line A Meter",
        "meterType": "PHYSICAL",
        "entity_id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5"
    }
}
```

**Frontend Action:**
- Show success: "Meter created!"
- Show meter in list

---

### **Step 5.2: Consumer Views Meters (Consumer → API)**

**Frontend Screen (Consumer):**
```
┌─────────────────────────────────────┐
│  Dashboard - Patanjali Industries    │
│                                       │
│  Welcome, Patanjali Consumer!         │
│                                       │
│  My Meters:                           │
│  ├─ Production Line A Meter           │
│  │  Type: Physical                    │
│  │  Location: Building 1              │
│  │  [View Details]                    │
│                                       │
│  Total Meters: 1                      │
└─────────────────────────────────────┘
```

**API Call:**
```http
GET {{base_url}}/api/meters/entity/f1886b9f-0e81-4282-b87e-3cc742a2c2e5
Authorization: Bearer {{consumerToken}}
```

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": "meter-physical-001",
            "name": "Production Line A Meter",
            "meterType": "PHYSICAL",
            "entity_id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",
            "attributes": {
                "location": "Building 1",
                "manufacturer": "Schneider Electric"
            }
        }
    ]
}
```

**Frontend Action:**
- Display meters in list
- Consumer can view but cannot create/edit (read-only)

---

## 📊 Complete Flow Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 0: MANUAL DB SETUP (One-Time)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SQL: INSERT Admin Profile                                       │
│  SQL: INSERT Root Entity                                         │
│  SQL: INSERT Root Admin User                                     │
│                                                                  │
│  ✅ System is ready for API usage                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: ROOT ADMIN SETUP (Via API)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend: Login Screen                                          │
│  └─ API: POST /api/auth/login                                   │
│     ✅ Token received                                            │
│                                                                  │
│  Frontend: Create Modules                                        │
│  └─ API: POST /api/modules (6 times)                            │
│     ✅ All modules created                                       │
│                                                                  │
│  Frontend: Create Admin Role                                     │
│  └─ API: POST /api/roles                                        │
│     ✅ Admin role created                                        │
│                                                                  │
│  Frontend: Assign Role to User                                   │
│  └─ API: PATCH /api/users/:id                                   │
│     ✅ User has full permissions                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: TENANT CREATION (Via API)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend: Create Tenant Profile                                 │
│  └─ API: POST /api/profiles                                     │
│     ✅ Tenant Profile (entity-scoped to root)                   │
│                                                                  │
│  Frontend: Create Tenant Entity                                  │
│  └─ API: POST /api/entities                                     │
│     ✅ Tenant Entity (KMP Energy)                                │
│                                                                  │
│  Frontend: Create Tenant Admin Role                              │
│  └─ API: POST /api/roles                                        │
│     ✅ Tenant Admin Role                                         │
│                                                                  │
│  Frontend: Create Tenant Admin User                              │
│  └─ API: POST /api/users                                        │
│     ✅ Tenant Admin User                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: CUSTOMER CREATION (Via API)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend: Login as Tenant Admin                                │
│  └─ API: POST /api/auth/login                                   │
│     ✅ Tenant token received                                     │
│                                                                  │
│  Frontend: Create Customer Profile                               │
│  └─ API: POST /api/profiles                                     │
│     ✅ Customer Profile (entity-scoped to tenant)                │
│                                                                  │
│  Frontend: Create Customer Entity                                │
│  └─ API: POST /api/entities                                     │
│     ✅ Customer Entity (Ideal Energy)                            │
│                                                                  │
│  Frontend: Create Customer Admin Role                             │
│  └─ API: POST /api/roles                                        │
│     ✅ Customer Admin Role                                       │
│                                                                  │
│  Frontend: Create Customer Admin User                             │
│  └─ API: POST /api/users                                        │
│     ✅ Customer Admin User                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: CONSUMER CREATION (Via API)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend: Login as Customer Admin                               │
│  └─ API: POST /api/auth/login                                   │
│     ✅ Customer token received                                   │
│                                                                  │
│  Frontend: Create Consumer Profile                               │
│  └─ API: POST /api/profiles                                     │
│     ✅ Consumer Profile (entity-scoped to customer)              │
│                                                                  │
│  Frontend: Create Consumer Entity                                 │
│  └─ API: POST /api/entities                                     │
│     ✅ Consumer Entity (Patanjali Industries)                    │
│                                                                  │
│  Frontend: Create Consumer Role                                   │
│  └─ API: POST /api/roles                                        │
│     ✅ Consumer Role (read-only meters)                          │
│                                                                  │
│  Frontend: Create Consumer User                                   │
│  └─ API: POST /api/users                                        │
│     ✅ Consumer User                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: METER MANAGEMENT (Via API)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (Customer Admin): Create Meter                         │
│  └─ API: POST /api/meters                                       │
│     ✅ Meter created for consumer                                │
│                                                                  │
│  Frontend (Consumer): View Meters                                │
│  └─ API: GET /api/meters/entity/:entityId                        │
│     ✅ Consumer sees meters (read-only)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Entity Hierarchy Flow

```
Manual Setup:
┌─────────────────────────────────────────────┐
│ Admin Profile (global)                      │
│ Root Entity (entity_id = NULL)              │
│ Root Admin User                             │
└─────────────────────────────────────────────┘
         ↓
API Calls:
┌─────────────────────────────────────────────┐
│ Modules (6 modules)                         │
│ Admin Role (global)                         │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Tenant Profile (entity-scoped to root)      │
│ Tenant Entity (KMP Energy)                  │
│ Tenant Admin Role                           │
│ Tenant Admin User                            │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Customer Profile (entity-scoped to tenant)   │
│ Customer Entity (Ideal Energy)              │
│ Customer Admin Role                         │
│ Customer Admin User                          │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Consumer Profile (entity-scoped to customer)│
│ Consumer Entity (Patanjali Industries)       │
│ Consumer Role (read-only)                   │
│ Consumer User                                │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│ Meters (Physical/Virtual/Group)             │
│ Assigned to Consumer Entity                 │
└─────────────────────────────────────────────┘
```

---

## 📋 Quick Reference: What Goes Where

### **Manual DB Insert (3 things only):**
1. ✅ Admin Profile
2. ✅ Root Entity
3. ✅ Root Admin User

### **Via API (Everything else):**
- All modules
- All roles
- All profiles (after Admin)
- All entities (after Root)
- All users (after Root Admin)
- All meters

---

## 🎯 Complete Flow Summary Table

| Step | Who | Action | API Endpoint | Result |
|------|-----|--------|--------------|--------|
| **0.1** | DBA | Insert Admin Profile | Manual SQL | Admin Profile created |
| **0.2** | DBA | Insert Root Entity | Manual SQL | Root Entity created |
| **0.3** | DBA | Insert Root Admin User | Manual SQL | Root Admin User created |
| **1.1** | Root Admin | Login | `POST /api/auth/login` | Token received |
| **1.2** | Root Admin | Create Modules | `POST /api/modules` (×6) | 6 modules created |
| **1.3** | Root Admin | Create Admin Role | `POST /api/roles` | Admin role created |
| **1.4** | Root Admin | Assign Role | `PATCH /api/users/:id` | User has permissions |
| **2.1** | Root Admin | Create Tenant Profile | `POST /api/profiles` | Tenant profile created |
| **2.2** | Root Admin | Create Tenant Entity | `POST /api/entities` | Tenant entity created |
| **2.3** | Root Admin | Create Tenant Admin Role | `POST /api/roles` | Tenant admin role created |
| **2.4** | Root Admin | Create Tenant Admin User | `POST /api/users` | Tenant admin user created |
| **3.1** | Tenant Admin | Login | `POST /api/auth/login` | Tenant token received |
| **3.2** | Tenant Admin | Create Customer Profile | `POST /api/profiles` | Customer profile created |
| **3.3** | Tenant Admin | Create Customer Entity | `POST /api/entities` | Customer entity created |
| **3.4** | Tenant Admin | Create Customer Admin Role | `POST /api/roles` | Customer admin role created |
| **3.5** | Tenant Admin | Create Customer Admin User | `POST /api/users` | Customer admin user created |
| **4.1** | Customer Admin | Login | `POST /api/auth/login` | Customer token received |
| **4.2** | Customer Admin | Create Consumer Profile | `POST /api/profiles` | Consumer profile created |
| **4.3** | Customer Admin | Create Consumer Entity | `POST /api/entities` | Consumer entity created |
| **4.4** | Customer Admin | Create Consumer Role | `POST /api/roles` | Consumer role created |
| **4.5** | Customer Admin | Create Consumer User | `POST /api/users` | Consumer user created |
| **5.1** | Customer Admin | Create Meter | `POST /api/meters` | Meter created |
| **5.2** | Consumer | View Meters | `GET /api/meters/entity/:id` | Meters displayed |

---

## 💡 Key Insights

1. **Only 3 manual inserts**: Everything else is automated via API
2. **Each level creates the next**: Root → Tenant → Customer → Consumer
3. **Profiles are entity-scoped**: Following your dump pattern
4. **Roles control access**: Each level has appropriate permissions
5. **Tokens are level-specific**: Each user gets their own token
6. **Hierarchy isolation works**: Users only see their accessible data

---

## ✅ Final State

After completing all phases:

```
✅ Root Admin (ritik.gupta@etlab.co)
   └─ Can manage everything
   
✅ Tenant Admin (admin@kmp.in)
   └─ Can manage KMP Energy + all children
   
✅ Customer Admin (admin@idealenergy.co)
   └─ Can manage Ideal Energy + all children
   
✅ Consumer User (consumer@patanjali.com)
   └─ Can view Patanjali meters (read-only)
   
✅ Meters created and assigned
   └─ Consumer can view them
```

**The complete automation flow is working!** 🎉

---

This document shows **exactly** what happens at each step, from database setup to consumer viewing meters, with both frontend screens and API calls side-by-side.

