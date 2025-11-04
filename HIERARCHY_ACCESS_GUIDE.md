# 🔐 Hierarchy Access Guide - Who Can See What?

## 📊 Your Entity Hierarchy Structure

Based on your database:

```
┌─────────────────────────────────────────────┐
│ ROOT: ETL Admin                              │
│ ID: d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca     │
│ User: ritik.gupta@etlab.co                   │
└───────────────┬─────────────────────────────┘
                │
                │ (parent of)
                ▼
┌─────────────────────────────────────────────┐
│ TENANT: KMP                                   │
│ ID: 6648975a-d7ce-41bd-aeb6-47e905b5232f     │
└───────────────┬─────────────────────────────┘
                │
                │ (parent of)
                ▼
┌─────────────────────────────────────────────┐
│ CUSTOMER: Ideal Energy                       │
│ ID: 5564b446-5b2a-4a2b-becc-d0cef79d2435    │
└───────────────┬─────────────────────────────┘
                │
                │ (parent of)
                ▼
┌─────────────────────────────────────────────┐
│ CONSUMER: Patanjali                          │
│ ID: f1886b9f-0e81-4282-b87e-3cc742a2c2e5    │
└─────────────────────────────────────────────┘
```

---

## 🎯 To See Patanjali's Hierarchy

### **Option 1: Login as Root Admin** (ritik.gupta@etlab.co) ✅ **RECOMMENDED**

**Why:** Root Admin can see ALL entities in the system, including Patanjali.

**How to Query:**

1. **Get Patanjali's direct hierarchy** (Patanjali only, since it has no children):
   ```bash
   GET /api/entities/f1886b9f-0e81-4282-b87e-3cc742a2c2e5/hierarchy
   ```
   **Response:** Returns Patanjali entity only

2. **Get Ideal Energy's hierarchy** (Ideal Energy + Patanjali + other consumers):
   ```bash
   GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435/hierarchy
   ```
   **Response:** Returns Ideal Energy + all its consumers (Patanjali, NAWLA ISPAT, etc.)

3. **Get KMP's hierarchy** (KMP + Ideal Energy + Patanjali + everything):
   ```bash
   GET /api/entities/6648975a-d7ce-41bd-aeb6-47e905b5232f/hierarchy
   ```
   **Response:** Returns KMP + all customers + all consumers

4. **List all entities** (see everything):
   ```bash
   GET /api/entities?page=1&limit=100
   ```
   **Response:** Returns all entities (Root, KMP, Ideal Energy, Patanjali, etc.)

---

### **Option 2: Login as Tenant Admin** (if exists)

If you created a Tenant Admin user for KMP:
- **Can see:** KMP + Ideal Energy + Patanjali + all entities below KMP
- **Cannot see:** Root entity or other tenants

**Query:**
```bash
GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435/hierarchy
```

---

### **Option 3: Login as Customer Admin** (if exists)

If you created a Customer Admin user for Ideal Energy:
- **Can see:** Ideal Energy + Patanjali + all consumers under Ideal Energy
- **Cannot see:** KMP or Root entity

**Query:**
```bash
GET /api/entities/f1886b9f-0e81-4282-b87e-3cc742a2c2e5/hierarchy
```

---

### **Option 4: Login as Consumer User** (if exists)

If you created a Consumer user for Patanjali:
- **Can see:** Only Patanjali entity
- **Cannot see:** Ideal Energy, KMP, or Root

**Query:**
```bash
GET /api/entities/f1886b9f-0e81-4282-b87e-3cc742a2c2e5/hierarchy
```

---

## 🔍 Understanding Hierarchy Endpoint Behavior

### **What `/api/entities/{entityId}/hierarchy` Returns:**

It returns:
1. **The entity itself** (specified by `{entityId}`)
2. **ALL descendant entities** (children, grandchildren, etc.)

### **Examples:**

#### **Example 1: Query Patanjali's Hierarchy**
```
GET /api/entities/f1886b9f-0e81-4282-b87e-3cc742a2c2e5/hierarchy
```

**Returns:**
```json
[
  {
    "id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",
    "name": "Patanjali",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
  }
]
```
*Only Patanjali (no children)*

---

#### **Example 2: Query Ideal Energy's Hierarchy**
```
GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435/hierarchy
```

**Returns:**
```json
[
  {
    "id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",
    "name": "Ideal Energy",
    "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"
  },
  {
    "id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",
    "name": "Patanjali",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
  },
  {
    "id": "dbe3c109-925a-4996-be72-5c497bc3add8",
    "name": "NAWLA ISPAT PRIVATE LIMITED",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
  }
]
```
*Ideal Energy + all its consumers (Patanjali, NAWLA, etc.)*

---

#### **Example 3: Query KMP's Hierarchy**
```
GET /api/entities/6648975a-d7ce-41bd-aeb6-47e905b5232f/hierarchy
```

**Returns:**
```json
[
  {
    "id": "6648975a-d7ce-41bd-aeb6-47e905b5232f",
    "name": "KMP",
    "entity_id": "d2c30a2f-4cd2-4c39-b2be-50dcbdcbd8ca"
  },
  {
    "id": "5564b446-5b2a-4a2b-becc-d0cef79d2435",
    "name": "Ideal Energy",
    "entity_id": "6648975a-d7ce-41bd-aeb6-47e905b5232f"
  },
  {
    "id": "f1886b9f-0e81-4282-b87e-3cc742a2c2e5",
    "name": "Patanjali",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
  },
  {
    "id": "dbe3c109-925a-4996-be72-5c497bc3add8",
    "name": "NAWLA ISPAT PRIVATE LIMITED",
    "entity_id": "5564b446-5b2a-4a2b-becc-d0cef79d2435"
  }
]
```
*KMP + all customers + all consumers*

---

## ❓ Your Current Issue Explained

You mentioned: **"when i kept the entity id to ideal energy one kmp is coming"**

This means when you query:
```
GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435/hierarchy
```

You're seeing KMP in the response, which is **WRONG**!

### **Why This Shouldn't Happen:**

The hierarchy endpoint should return:
- ✅ Ideal Energy (the entity you queried)
- ✅ Patanjali (child of Ideal Energy)
- ✅ NAWLA ISPAT (child of Ideal Energy)
- ❌ **NOT KMP** (KMP is the parent, not a child!)

### **Possible Causes:**

1. **Database relationship issue:** Check if `entity_id` field in database is correct
2. **Query issue:** The recursive CTE might be going up instead of down

Let me check the hierarchy query...

---

## 🔧 Quick Answer to Your Question

**"Which account to login if i want to see the patanjali hierarchy?"**

**Answer:** 
- ✅ **Login as Root Admin** (ritik.gupta@etlab.co)
- ✅ Query: `GET /api/entities/f1886b9f-0e81-4282-b87e-3cc742a2c2e5/hierarchy`

This will return Patanjali (it has no children, so you'll only see Patanjali itself).

---

**OR** if you want to see Patanjali as part of a larger hierarchy:
- ✅ Query: `GET /api/entities/5564b446-5b2a-4a2b-becc-d0cef79d2435/hierarchy`
- ✅ This will show: Ideal Energy + Patanjali + other consumers

---

## 🎯 Summary Table

| Login As | Can See | Query Patanjali | Query Ideal Energy |
|----------|---------|-----------------|-------------------|
| **Root Admin** (ritik.gupta@etlab.co) | ✅ Everything | ✅ Yes | ✅ Yes (shows children) |
| Tenant Admin | ✅ KMP + below | ✅ Yes | ✅ Yes |
| Customer Admin | ✅ Ideal Energy + below | ✅ Yes | ✅ Yes |
| Consumer User | ✅ Only Patanjali | ✅ Yes (only self) | ❌ No |

**Best option:** Login as Root Admin (ritik.gupta@etlab.co) to see everything!

