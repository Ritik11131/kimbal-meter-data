# 🔍 Global Search API - Frontend Integration Guide

## Overview

This guide provides complete documentation for integrating the Global Search API into your frontend application. The search API allows users to search across **Entities**, **Users**, **Profiles**, **Roles**, and **Meters** with category-wise results and hierarchy support.

### Key Feature: Path-Only Hierarchy

**Important**: The hierarchy endpoint returns **ONLY the exact path** from the logged-in user's entity to the selected resource. This means:

- **No siblings** - Only the direct path is shown
- **No other children** - Only entities/users in the path to the selected resource
- **Linear path structure** - Returns a simple array, not a full tree

**Response Structure**:
- **Entities**: Returns a single `path` array (entity path only)
- **Users**: Returns `entityPath` (entity hierarchy) and `userPath` (user hierarchy)
- **Profiles**: Returns `entityPath` (entity hierarchy) and `userPath` (user hierarchy to profile creator)
- **Roles**: Returns `entityPath` (entity hierarchy) and `userPath` (user hierarchy to role creator)
- **Meters**: Returns `entityPath` (entity hierarchy) and `userPath` (user hierarchy to meter creator)

**Example**: If searching for a meter "X" under entity "Patanjali Customer":
- **Entity Path**: Ritik (Root) → KMP Admin → Patanjali Customer → X Consumer
- **User Path**: Root User → Meter Creator
- **Does NOT show**: Other children of KMP Admin, other children of Patanjali Customer, or other meters

The hierarchy always starts from the **logged-in user's entity**:
- **Root Admin (ETL Admin)**: Path starts from ETL Admin
- **KMP Admin**: Path starts from KMP Energy
- **Ideal Energy Admin**: Path starts from Ideal Energy

The selected resource is **highlighted** with `isSelected: true` in the path array.

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Frontend Flow](#frontend-flow)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [API Request/Response Examples](#api-requestresponse-examples)
5. [Error Handling](#error-handling)
6. [UI/UX Recommendations](#uiux-recommendations)

---

## API Endpoints

### 1. Global Search Endpoint

**Endpoint**: `GET /api/search`

**Purpose**: Search across all resource types (Entities, Users, Profiles, Roles, Meters)

**Authentication**: Required (JWT token in Authorization header)

**Query Parameters**:
- `q` (required): Search query string (min 1, max 255 characters)
- `type` (optional): Filter by resource type(s)
  - Single: `type=entity`
  - Multiple: `type=entity,user,meter`
  - Valid values: `entity`, `user`, `profile`, `role`, `meter`
- `page` (optional): Page number (default: 1, min: 1)
- `limit` (optional): Items per page (default: 10, min: 1, max: 100)

**Example Requests**:
```bash
# Search everything
GET /api/search?q=john&page=1&limit=10

# Search only entities and users
GET /api/search?q=energy&type=entity,user&page=1&limit=10

# Search only profiles
GET /api/search?q=admin&type=profile

# Search only meters
GET /api/search?q=meter&type=meter
```

---

### 2. Get Hierarchy Endpoint

**Endpoint**: `GET /api/search/:type/:id/hierarchy`

**Purpose**: Get the **exact path** from the logged-in user's entity to the selected resource (path-only, no siblings or other children)

**Important Behavior**:
- **Returns ONLY the direct path** - no siblings, no other children
- **Hierarchy always starts from the logged-in user's entity** (not from the selected resource)
- If logged in as **Root Admin (ETL Admin)**, path starts from ETL Admin
- If logged in as **KMP Admin**, path starts from KMP Admin
- If logged in as **Ideal Energy**, path starts from Ideal Energy
- The selected resource/creator is highlighted with `isSelected: true` in the path array
- Returns **linear path arrays**, not tree structures

**Response Structure**:
- **Entities**: Single `path` array (entity path only)
- **Users, Profiles, Roles, Meters**: `entityPath` array (entity hierarchy) and `userPath` array (user hierarchy to creator)

**Example Path**: 
- Searching for meter "X" under "Patanjali Customer":
- **Entity Path**: Ritik (Root) → KMP Admin → Patanjali Customer → X Consumer
- **User Path**: Root User → Meter Creator
- **NOT shown**: Other children of KMP Admin, other children of Patanjali Customer, other meters

**Authentication**: Required (JWT token in Authorization header)

**Path Parameters**:
- `type`: Resource type (`entity`, `user`, `profile`, `role`, `meter`)
- `id`: Resource ID (UUID) - The selected resource to find in hierarchy

**Query Parameters**: None (path-only results don't support pagination or depth limits)

**Example Requests**:
```bash
# Get entity hierarchy (shows from logged-in user's entity to selected entity)
GET /api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy

# Get user hierarchy with depth limit
GET /api/search/user/550e8400-e29b-41d4-a716-446655440000/hierarchy?depth=3

# Get profile hierarchy
GET /api/search/profile/550e8400-e29b-41d4-a716-446655440000/hierarchy

# Get meter hierarchy
GET /api/search/meter/550e8400-e29b-41d4-a716-446655440000/hierarchy
```

**Response Structure**:
- Returns a **path array** (not a tree) starting from `userEntity` (logged-in user's entity)
- The selected resource is marked with `isSelected: true` in the path array
- For entities: Shows entity path array
- For users: Shows entity path + user path arrays
- For profiles/roles/meters: Shows entity path + the resource itself

---

## Frontend Flow

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User types in topbar search field                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend calls GET /api/search?q=<query>                 │
│    (with debounce to avoid excessive requests)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Display results grouped by category:                      │
│    - Entities (15)                                          │
│    - Users (8)                                               │
│    - Profiles (3)                                            │
│    - Roles (5)                                               │
│    - Meters (12)                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. User clicks on a result                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend calls GET /api/search/:type/:id/hierarchy        │
│    API automatically:                                        │
│    - Gets logged-in user's entity (from JWT)                │
│    - Finds exact path from user's entity to resource        │
│    - Returns path array (no siblings, no other children)   │
│    - Marks selected resource with isSelected: true          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Display path view (linear, not tree) starting from:        │
│    - Root Admin → if logged in as Root Admin                │
│    - KMP Admin → if logged in as KMP Admin                  │
│    - Ideal Energy → if logged in as Ideal Energy            │
│    Selected resource is highlighted in the path              │
│    Example: Ritik → KMP → Patanjali → Consumer → Meter      │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Integration

### Step 1: Setup Search Component

Create a search component in your topbar/navigation:

```typescript
// components/SearchBar.tsx
import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash'; // or implement your own debounce

interface SearchResult {
  entities: PaginatedResult<Entity>;
  users: PaginatedResult<User>;
  profiles: PaginatedResult<Profile>;
  roles: PaginatedResult<Role>;
  meters: PaginatedResult<Meter>;
  pagination: {
    totalResults: number;
    hasMore: boolean;
  };
}

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&page=1&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.data);
      } catch (err) {
        setError('Failed to search. Please try again.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms debounce
    []
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities, users, profiles, roles, meters..."
        className="search-input"
      />
      {loading && <div className="loading-spinner">Searching...</div>}
      {error && <div className="error-message">{error}</div>}
      {results && <SearchResults results={results} />}
    </div>
  );
};
```

---

### Step 2: Display Search Results

Create a component to display category-wise results:

```typescript
// components/SearchResults.tsx
interface SearchResultsProps {
  results: SearchResult;
}

export const SearchResults = ({ results }: SearchResultsProps) => {
  const handleResultClick = async (type: string, id: string) => {
    // Navigate to hierarchy view
    const hierarchy = await fetchHierarchy(type, id);
    // Display hierarchy in modal or navigate to hierarchy page
    showHierarchyModal(hierarchy);
  };

  return (
    <div className="search-results">
      {/* Entities Section */}
      {results.entities.total > 0 && (
        <div className="result-category">
          <h3>Entities ({results.entities.total})</h3>
          <ul>
            {results.entities.data.map((entity) => (
              <li
                key={entity.id}
                onClick={() => handleResultClick('entity', entity.id)}
                className="result-item"
              >
                <div className="result-name">{entity.name}</div>
                <div className="result-meta">{entity.email_id}</div>
              </li>
            ))}
          </ul>
          {results.entities.totalPages > 1 && (
            <button onClick={() => loadMore('entity')}>Load More</button>
          )}
        </div>
      )}

      {/* Users Section */}
      {results.users.total > 0 && (
        <div className="result-category">
          <h3>Users ({results.users.total})</h3>
          <ul>
            {results.users.data.map((user) => (
              <li
                key={user.id}
                onClick={() => handleResultClick('user', user.id)}
                className="result-item"
              >
                <div className="result-name">{user.name}</div>
                <div className="result-meta">{user.email}</div>
              </li>
            ))}
          </ul>
          {results.users.totalPages > 1 && (
            <button onClick={() => loadMore('user')}>Load More</button>
          )}
        </div>
      )}

      {/* Profiles Section */}
      {results.profiles.total > 0 && (
        <div className="result-category">
          <h3>Profiles ({results.profiles.total})</h3>
          <ul>
            {results.profiles.data.map((profile) => (
              <li
                key={profile.id}
                onClick={() => handleResultClick('profile', profile.id)}
                className="result-item"
              >
                <div className="result-name">{profile.name}</div>
              </li>
            ))}
          </ul>
          {results.profiles.totalPages > 1 && (
            <button onClick={() => loadMore('profile')}>Load More</button>
          )}
        </div>
      )}

      {/* Roles Section */}
      {results.roles.total > 0 && (
        <div className="result-category">
          <h3>Roles ({results.roles.total})</h3>
          <ul>
            {results.roles.data.map((role) => (
              <li
                key={role.id}
                onClick={() => handleResultClick('role', role.id)}
                className="result-item"
              >
                <div className="result-name">{role.name}</div>
              </li>
            ))}
          </ul>
          {results.roles.totalPages > 1 && (
            <button onClick={() => loadMore('role')}>Load More</button>
          )}
        </div>
      )}

      {/* Meters Section */}
      {results.meters.total > 0 && (
        <div className="result-category">
          <h3>Meters ({results.meters.total})</h3>
          <ul>
            {results.meters.data.map((meter) => (
              <li
                key={meter.id}
                onClick={() => handleResultClick('meter', meter.id)}
                className="result-item"
              >
                <div className="result-name">{meter.name}</div>
                <div className="result-meta">{meter.meter_type}</div>
              </li>
            ))}
          </ul>
          {results.meters.totalPages > 1 && (
            <button onClick={() => loadMore('meter')}>Load More</button>
          )}
        </div>
      )}

      {results.pagination.totalResults === 0 && (
        <div className="no-results">No results found</div>
      )}
    </div>
  );
};
```

---

### Step 3: Fetch and Display Hierarchy

Create a function to fetch hierarchy and display it:

```typescript
// utils/searchApi.ts
export const fetchHierarchy = async (
  type: 'entity' | 'user' | 'profile' | 'role' | 'meter',
  id: string
) => {
  const url = `/api/search/${type}/${id}/hierarchy`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch hierarchy');
  }

  const data = await response.json();
  return data.data;
};

// components/HierarchyView.tsx
interface PathItem {
  id: string;
  name: string;
  type: 'entity' | 'user' | 'profile' | 'role' | 'meter';
  isSelected: boolean;
  email_id?: string;
  email?: string;
  entityId?: string;
}

interface EntityPathResponse {
  userEntity: { id: string; name: string; email_id?: string };
  selectedResource: { type: 'entity'; id: string; name: string };
  path: PathItem[];
}

interface UserPathResponse {
  userEntity: { id: string; name: string; email_id?: string };
  selectedResource: { type: 'user'; id: string; name: string; entityId: string };
  entityPath: PathItem[];
  userPath: PathItem[];
}

interface ProfilePathResponse {
  userEntity: { id: string; name: string; email_id?: string };
  selectedResource: { type: 'profile'; id: string; name: string; entityId: string | null };
  profile: any;
  entityPath: PathItem[];
  userPath: PathItem[];
}

interface RolePathResponse {
  userEntity: { id: string; name: string; email_id?: string };
  selectedResource: { type: 'role'; id: string; name: string; entityId: string | null };
  role: any;
  entityPath: PathItem[];
  userPath: PathItem[];
}

interface MeterPathResponse {
  userEntity: { id: string; name: string; email_id?: string };
  selectedResource: { type: 'meter'; id: string; name: string; entityId: string };
  meter: any;
  entityPath: PathItem[];
  userPath: PathItem[];
}

interface HierarchyViewProps {
  hierarchy: EntityPathResponse | UserPathResponse | ProfilePathResponse | RolePathResponse | MeterPathResponse;
  type: string;
}

export const HierarchyView = ({ hierarchy, type }: HierarchyViewProps) => {
  const renderPath = (path: PathItem[]) => {
    return (
      <div className="path-container">
        {path.map((item, index) => (
          <div key={item.id} className="path-item-container">
            <div className={`path-item ${item.isSelected ? 'selected' : ''}`}>
              <span className="path-icon">
                {item.type === 'entity' && '📁'}
                {item.type === 'user' && '👤'}
                {item.type === 'profile' && '📋'}
                {item.type === 'role' && '🔐'}
                {item.type === 'meter' && '⚡'}
              </span>
              <span className="path-name">{item.name}</span>
              {item.email_id && <span className="path-meta">{item.email_id}</span>}
              {item.email && <span className="path-meta">{item.email}</span>}
              {item.isSelected && <span className="path-badge">Selected</span>}
            </div>
            {index < path.length - 1 && <div className="path-arrow">→</div>}
          </div>
        ))}
      </div>
    );
  };

  const renderEntityPath = (hierarchy: EntityPathResponse) => {
    return (
      <div className="hierarchy-view">
        <div className="path-header">
          <h3>Path from {hierarchy.userEntity.name}</h3>
        </div>
        {renderPath(hierarchy.path)}
      </div>
    );
  };

  const renderUserPath = (hierarchy: UserPathResponse) => {
    return (
      <div className="hierarchy-view">
        <div className="path-header">
          <h3>Path from {hierarchy.userEntity.name}</h3>
        </div>
        <div className="path-section">
          <h4>Entity Path:</h4>
          {renderPath(hierarchy.entityPath)}
        </div>
        <div className="path-section">
          <h4>User Path:</h4>
          {renderPath(hierarchy.userPath)}
        </div>
      </div>
    );
  };

  const renderProfilePath = (hierarchy: ProfilePathResponse) => {
    return (
      <div className="hierarchy-view">
        <div className="path-header">
          <h3>Path from {hierarchy.userEntity.name}</h3>
        </div>
        {hierarchy.entityPath.length > 0 && (
          <div className="path-section">
            <h4>Entity Path:</h4>
            {renderPath(hierarchy.entityPath)}
          </div>
        )}
        {hierarchy.userPath.length > 0 && (
          <div className="path-section">
            <h4>User Path:</h4>
            {renderPath(hierarchy.userPath)}
          </div>
        )}
      </div>
    );
  };

  const renderRolePath = (hierarchy: RolePathResponse) => {
    return (
      <div className="hierarchy-view">
        <div className="path-header">
          <h3>Path from {hierarchy.userEntity.name}</h3>
        </div>
        {hierarchy.entityPath.length > 0 && (
          <div className="path-section">
            <h4>Entity Path:</h4>
            {renderPath(hierarchy.entityPath)}
          </div>
        )}
        {hierarchy.userPath.length > 0 && (
          <div className="path-section">
            <h4>User Path:</h4>
            {renderPath(hierarchy.userPath)}
          </div>
        )}
      </div>
    );
  };

  const renderMeterPath = (hierarchy: MeterPathResponse) => {
    return (
      <div className="hierarchy-view">
        <div className="path-header">
          <h3>Path from {hierarchy.userEntity.name}</h3>
        </div>
        {hierarchy.entityPath.length > 0 && (
          <div className="path-section">
            <h4>Entity Path:</h4>
            {renderPath(hierarchy.entityPath)}
          </div>
        )}
        {hierarchy.userPath.length > 0 && (
          <div className="path-section">
            <h4>User Path:</h4>
            {renderPath(hierarchy.userPath)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hierarchy-view">
      {type === 'entity' && renderEntityPath(hierarchy as EntityPathResponse)}
      {type === 'user' && renderUserPath(hierarchy as UserPathResponse)}
      {type === 'profile' && renderProfilePath(hierarchy as ProfilePathResponse)}
      {type === 'role' && renderRolePath(hierarchy as RolePathResponse)}
      {type === 'meter' && renderMeterPath(hierarchy as MeterPathResponse)}
    </div>
  );
};
```

---

## API Request/Response Examples

### Example 1: Global Search Request

**Request**:
```http
GET /api/search?q=john&page=1&limit=10
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Search results retrieved",
  "data": {
    "entities": {
      "data": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John's Energy Corp",
          "email_id": "contact@johnsenergy.com",
          "mobile_no": "+1234567890",
          "entity_id": "660e8400-e29b-41d4-a716-446655440001",
          "profile_id": "770e8400-e29b-41d4-a716-446655440002",
          "attributes": null,
          "created_by": "880e8400-e29b-41d4-a716-446655440003",
          "creation_time": "2024-01-15T10:30:00Z",
          "last_update_on": "2024-01-15T10:30:00Z"
        }
      ],
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    },
    "users": {
      "data": [
        {
          "id": "990e8400-e29b-41d4-a716-446655440004",
          "entity_id": "550e8400-e29b-41d4-a716-446655440000",
          "email": "john.doe@example.com",
          "mobile_no": "+1234567891",
          "name": "John Doe",
          "is_active": true,
          "is_deleted": false,
          "attributes": null,
          "created_by": "aa0e8400-e29b-41d4-a716-446655440005",
          "creation_time": "2024-01-16T09:00:00Z",
          "last_update_on": "2024-01-16T09:00:00Z",
          "role_id": "bb0e8400-e29b-41d4-a716-446655440006"
        }
      ],
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "profiles": {
      "data": [
        {
          "id": "cc0e8400-e29b-41d4-a716-446655440007",
          "name": "John's Profile",
          "entity_id": "550e8400-e29b-41d4-a716-446655440000",
          "attributes": null,
          "created_by": "dd0e8400-e29b-41d4-a716-446655440008",
          "creation_time": "2024-01-17T08:00:00Z",
          "last_update_on": "2024-01-17T08:00:00Z"
        }
      ],
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "roles": {
      "data": [
        {
          "id": "ee0e8400-e29b-41d4-a716-446655440009",
          "entity_id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "John's Admin Role",
          "attributes": {
            "roles": [
              {
                "moduleId": "ff0e8400-e29b-41d4-a716-446655440010",
                "name": "Entity",
                "read": true,
                "write": true
              }
            ]
          },
          "created_by": "110e8400-e29b-41d4-a716-446655440011",
          "creation_time": "2024-01-18T07:00:00Z",
          "last_update_on": "2024-01-18T07:00:00Z"
        }
      ],
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "pagination": {
      "totalResults": 31,
      "hasMore": true
    }
  },
  "timestamp": 1705564800000,
  "path": "/api/search"
}
```

---

### Example 2: Search with Type Filter

**Request**:
```http
GET /api/search?q=energy&type=entity,user&page=1&limit=10
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Search results retrieved",
  "data": {
    "entities": {
      "data": [...],
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    },
    "users": {
      "data": [...],
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "profiles": {
      "data": [],
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    },
    "roles": {
      "data": [],
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0
    },
    "pagination": {
      "totalResults": 17,
      "hasMore": true
    }
  },
  "timestamp": 1705564800000,
  "path": "/api/search"
}
```

---

### Example 3: Get Entity Path

**Scenario**: User logged in as "KMP Admin" (entityId: `kmp-entity-id`), searching for "Ideal Energy" (entityId: `ideal-entity-id`)

**Request**:
```http
GET /api/search/entity/ideal-entity-id/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Entity path retrieved",
  "data": {
    "userEntity": {
      "id": "kmp-entity-id",
      "name": "KMP Energy",
      "email_id": "contact@kmpenergy.com"
    },
    "selectedResource": {
      "type": "entity",
      "id": "ideal-entity-id",
      "name": "Ideal Energy"
    },
    "path": [
      {
        "id": "kmp-entity-id",
        "name": "KMP Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@kmpenergy.com"
      },
      {
        "id": "ideal-entity-id",
        "name": "Ideal Energy",
        "type": "entity",
        "isSelected": true,
        "email_id": "contact@idealenergy.com"
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/entity/ideal-entity-id/hierarchy"
}
```

**Note**: 
- Path starts from logged-in user's entity (KMP Energy)
- Selected entity (Ideal Energy) is marked with `isSelected: true`
- **Only the direct path is shown** - no siblings, no other children
- Returns a linear array, not a tree structure

---

### Example 4: Get User Path

**Scenario**: User logged in as "KMP Admin", searching for user "Jane Smith" who belongs to "Ideal Energy" entity

**Request**:
```http
GET /api/search/user/jane-user-id/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User path retrieved",
  "data": {
    "userEntity": {
      "id": "kmp-entity-id",
      "name": "KMP Energy",
      "email_id": "contact@kmpenergy.com"
    },
    "selectedResource": {
      "type": "user",
      "id": "jane-user-id",
      "name": "Jane Smith",
      "entityId": "ideal-entity-id"
    },
    "entityPath": [
      {
        "id": "kmp-entity-id",
        "name": "KMP Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@kmpenergy.com"
      },
      {
        "id": "ideal-entity-id",
        "name": "Ideal Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@idealenergy.com"
      }
    ],
    "userPath": [
      {
        "id": "john-user-id",
        "name": "John Doe",
        "type": "user",
        "isSelected": false,
        "email": "john.doe@example.com",
        "entityId": "ideal-entity-id"
      },
      {
        "id": "jane-user-id",
        "name": "Jane Smith",
        "type": "user",
        "isSelected": true,
        "email": "jane.smith@example.com",
        "entityId": "ideal-entity-id"
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/user/jane-user-id/hierarchy"
}
```

**Note**:
- Shows entity path from logged-in user's entity (KMP Energy) to selected user's entity (Ideal Energy)
- Shows user path from root user to selected user (via created_by relationship)
- Selected user is marked with `isSelected: true`
- **Only the direct path is shown** - no siblings, no other children

---

### Example 5: Get Profile Path

**Scenario**: User logged in as "KMP Admin", searching for profile "Tenant Profile" that belongs to "Ideal Energy" entity

**Request**:
```http
GET /api/search/profile/profile-id/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile path retrieved",
  "data": {
    "userEntity": {
      "id": "kmp-entity-id",
      "name": "KMP Energy",
      "email_id": "contact@kmpenergy.com"
    },
    "selectedResource": {
      "type": "profile",
      "id": "profile-id",
      "name": "Tenant Profile",
      "entityId": "ideal-entity-id"
    },
    "profile": {
      "id": "profile-id",
      "name": "Tenant Profile",
      "entity_id": "ideal-entity-id",
      "attributes": null,
      "created_by": "dd0e8400-e29b-41d4-a716-446655440008",
      "creation_time": "2024-01-17T08:00:00Z",
      "last_update_on": "2024-01-17T08:00:00Z"
    },
    "entityPath": [
      {
        "id": "kmp-entity-id",
        "name": "KMP Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@kmpenergy.com"
      },
      {
        "id": "ideal-entity-id",
        "name": "Ideal Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@idealenergy.com"
      }
    ],
    "userPath": [
      {
        "id": "root-user-id",
        "name": "Root User",
        "type": "user",
        "isSelected": false,
        "email": "root@example.com",
        "entityId": "ideal-entity-id"
      },
      {
        "id": "dd0e8400-e29b-41d4-a716-446655440008",
        "name": "Profile Creator",
        "type": "user",
        "isSelected": true,
        "email": "creator@example.com",
        "entityId": "ideal-entity-id"
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/profile/profile-id/hierarchy"
}
```

**Note**:
- Shows entity path from logged-in user's entity (KMP Energy) to profile's entity (Ideal Energy)
- Shows user path from root user (in profile creator's entity) to profile creator
- Profile creator is marked with `isSelected: true` in user path
- **Only the direct path is shown** - no siblings, no other children

---

### Example 6: Get Role Path

**Scenario**: User logged in as "KMP Admin", searching for role "Admin Role" that belongs to "Ideal Energy" entity

**Request**:
```http
GET /api/search/role/role-id/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Role path retrieved",
  "data": {
    "userEntity": {
      "id": "kmp-entity-id",
      "name": "KMP Energy",
      "email_id": "contact@kmpenergy.com"
    },
    "selectedResource": {
      "type": "role",
      "id": "role-id",
      "name": "Admin Role",
      "entityId": "ideal-entity-id"
    },
    "role": {
      "id": "role-id",
      "name": "Admin Role",
      "entity_id": "ideal-entity-id",
      "attributes": {
        "roles": [
          {
            "moduleId": "module-1",
            "name": "Dashboard",
            "read": true,
            "write": false
          }
        ]
      },
      "created_by": "ee0e8400-e29b-41d4-a716-446655440009",
      "creation_time": "2024-01-18T09:00:00Z",
      "last_update_on": "2024-01-18T09:00:00Z"
    },
    "entityPath": [
      {
        "id": "kmp-entity-id",
        "name": "KMP Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@kmpenergy.com"
      },
      {
        "id": "ideal-entity-id",
        "name": "Ideal Energy",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@idealenergy.com"
      }
    ],
    "userPath": [
      {
        "id": "root-user-id",
        "name": "Root User",
        "type": "user",
        "isSelected": false,
        "email": "root@example.com",
        "entityId": "ideal-entity-id"
      },
      {
        "id": "ee0e8400-e29b-41d4-a716-446655440009",
        "name": "Role Creator",
        "type": "user",
        "isSelected": true,
        "email": "creator@example.com",
        "entityId": "ideal-entity-id"
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/role/role-id/hierarchy"
}
```

**Note**:
- Shows entity path from logged-in user's entity (KMP Energy) to role's entity (Ideal Energy)
- Shows user path from root user (in role creator's entity) to role creator
- Role creator is marked with `isSelected: true` in user path
- **Only the direct path is shown** - no siblings, no other children

---

### Example 7: Get Meter Path

**Scenario**: User logged in as "Root Admin (Ritik)", searching for meter "Meter X" under entity "X Consumer"

**Request**:
```http
GET /api/search/meter/meter-x-id/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Meter path retrieved",
  "data": {
    "userEntity": {
      "id": "ritik-entity-id",
      "name": "Ritik (Root)",
      "email_id": "ritik@example.com"
    },
    "selectedResource": {
      "type": "meter",
      "id": "meter-x-id",
      "name": "Meter X",
      "entityId": "x-consumer-entity-id"
    },
    "meter": {
      "id": "meter-x-id",
      "name": "Meter X",
      "entity_id": "x-consumer-entity-id",
      "meter_type": "PHYSICAL",
      "attributes": null,
      "tb_ref_id": null,
      "tb_token": null,
      "created_by": "880e8400-e29b-41d4-a716-446655440003",
      "creation_time": "2024-01-20T10:00:00Z",
      "last_update_on": "2024-01-20T10:00:00Z"
    },
    "entityPath": [
      {
        "id": "ritik-entity-id",
        "name": "Ritik (Root)",
        "type": "entity",
        "isSelected": false,
        "email_id": "ritik@example.com"
      },
      {
        "id": "kmp-entity-id",
        "name": "KMP Admin",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@kmpenergy.com"
      },
      {
        "id": "patanjali-entity-id",
        "name": "Patanjali Customer",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@patanjali.com"
      },
      {
        "id": "x-consumer-entity-id",
        "name": "X Consumer",
        "type": "entity",
        "isSelected": false,
        "email_id": "contact@xconsumer.com"
      }
    ],
    "userPath": [
      {
        "id": "root-user-id",
        "name": "Root User",
        "type": "user",
        "isSelected": false,
        "email": "root@example.com",
        "entityId": "x-consumer-entity-id"
      },
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "Meter Creator",
        "type": "user",
        "isSelected": true,
        "email": "creator@example.com",
        "entityId": "x-consumer-entity-id"
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/meter/meter-x-id/hierarchy"
}
```

**Note**:
- Shows entity path from logged-in user's entity (Ritik Root) to meter's entity (X Consumer)
- Shows user path from root user (in meter creator's entity) to meter creator
- Meter creator is marked with `isSelected: true` in user path
- **Only the direct path is shown** - no siblings, no other children
- Example Entity Path: Ritik → KMP Admin → Patanjali Customer → X Consumer
- Example User Path: Root User → Meter Creator

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": 1705564800000,
  "path": "/api/search"
}
```

### Common Error Scenarios

#### 1. Missing Search Query

**Request**:
```http
GET /api/search?page=1&limit=10
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Search query (q) is required",
  "timestamp": 1705564800000,
  "path": "/api/search"
}
```

#### 2. Invalid Resource Type

**Request**:
```http
GET /api/search/invalid/550e8400-e29b-41d4-a716-446655440000/hierarchy
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid resource type. Must be one of: entity, user, profile, role, meter",
  "timestamp": 1705564800000,
  "path": "/api/search/invalid/550e8400-e29b-41d4-a716-446655440000/hierarchy"
}
```

#### 3. Resource Not Found

**Request**:
```http
GET /api/search/entity/00000000-0000-0000-0000-000000000000/hierarchy
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Resource not found",
  "timestamp": 1705564800000,
  "path": "/api/search/entity/00000000-0000-0000-0000-000000000000/hierarchy"
}
```

#### 4. Unauthorized Access

**Request** (without token or invalid token):
```http
GET /api/search?q=test
```

**Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Unauthorized access",
  "timestamp": 1705564800000,
  "path": "/api/search"
}
```

#### 5. Access Denied (Entity Hierarchy)

**Request** (user trying to access entity outside their hierarchy):
```http
GET /api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy
```

**Response** (403 Forbidden):
```json
{
  "success": false,
  "error": "You do not have permission to access this resource",
  "timestamp": 1705564800000,
  "path": "/api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy"
}
```

### Frontend Error Handling Example

```typescript
const handleSearch = async (query: string) => {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          showError(`Invalid request: ${errorData.error}`);
          break;
        case 401:
          showError('Please log in to search');
          redirectToLogin();
          break;
        case 403:
          showError('You do not have permission to access this resource');
          break;
        case 404:
          showError('Resource not found');
          break;
        default:
          showError('An error occurred. Please try again.');
      }
      return;
    }

    const data = await response.json();
    setResults(data.data);
  } catch (error) {
    showError('Network error. Please check your connection.');
  }
};
```

---

## UI/UX Recommendations

### 1. Search Input Design

- **Placeholder**: "Search entities, users, profiles, roles..."
- **Debounce**: 300-500ms to avoid excessive API calls
- **Loading State**: Show spinner or "Searching..." text
- **Clear Button**: Allow users to clear search and reset results

### 2. Results Display

- **Category Headers**: Clearly label each category (Entities, Users, Profiles, Roles)
- **Result Count**: Show total count for each category
- **Highlighting**: Highlight matching text in results
- **Empty State**: Show friendly message when no results found
- **Pagination**: Show "Load More" or pagination controls for large result sets

### 3. Hierarchy View (Path Display)

- **Linear Path**: Display as a horizontal or vertical path (not a tree)
- **Path Separator**: Use arrows (→) or connectors between path items
- **Icons**: Use different icons for different resource types
  - 📁 for Entities
  - 👤 for Users
  - 📋 for Profiles
  - 🔐 for Roles
  - ⚡ for Meters
- **Highlighting**: Clearly highlight the selected resource/creator with `isSelected: true`
- **Dual Path Display**: For Users, Profiles, Roles, and Meters, display both:
  - **Entity Path**: Shows entity hierarchy from logged-in user's entity to resource's entity
  - **User Path**: Shows user hierarchy from root user to resource creator
- **Section Headers**: Use clear section headers like "Entity Path:" and "User Path:" to distinguish the two paths
- **Breadcrumbs**: Show path as breadcrumbs (Home > KMP > Ideal > Profile)
- **Loading State**: Show loading indicator while fetching path
- **Path Format**: 
  - **Entities**: `Entity 1 → Entity 2 → Entity 3 → Selected Entity`
  - **Users/Profiles/Roles/Meters**: 
    - Entity Path: `Entity 1 → Entity 2 → Entity 3`
    - User Path: `Root User → Creator User`

### 4. Mobile Responsiveness

- **Full-width Search**: Make search bar full width on mobile
- **Stacked Results**: Stack categories vertically on small screens
- **Touch-friendly**: Ensure result items are large enough for touch
- **Modal Hierarchy**: Show hierarchy in full-screen modal on mobile

### 5. Performance Optimization

- **Debouncing**: Implement debounce for search input (300ms recommended)
- **Caching**: Cache recent searches in localStorage
- **Lazy Loading**: Load hierarchy only when user clicks on result
- **Pagination**: Load results in pages to avoid large payloads

---

## Complete Integration Example

### React Component with All Features

```typescript
// components/GlobalSearch.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';

interface SearchState {
  query: string;
  results: SearchResult | null;
  loading: boolean;
  error: string | null;
  selectedResult: {
    type: string;
    id: string;
    hierarchy: any;
  } | null;
}

export const GlobalSearch: React.FC = () => {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: null,
    loading: false,
    error: null,
    selectedResult: null,
  });

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setState(prev => ({ ...prev, results: null, loading: false }));
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&page=1&limit=10`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        setState(prev => ({
          ...prev,
          results: data.data,
          loading: false,
          error: null,
        }));
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to search',
          results: null,
        }));
      }
    }, 300),
    []
  );

  const fetchHierarchy = async (type: string, id: string) => {
    try {
      const response = await fetch(
        `/api/search/${type}/${id}/hierarchy`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      throw error;
    }
  };

  const handleResultClick = async (type: string, id: string) => {
    try {
      const hierarchy = await fetchHierarchy(type, id);
      setState(prev => ({
        ...prev,
        selectedResult: { type, id, hierarchy },
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load hierarchy',
      }));
    }
  };

  useEffect(() => {
    performSearch(state.query);
  }, [state.query, performSearch]);

  return (
    <div className="global-search">
      {/* Search Input */}
      <div className="search-input-container">
        <input
          type="text"
          value={state.query}
          onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
          placeholder="Search entities, users, profiles, roles, meters..."
          className="search-input"
        />
        {state.loading && <div className="loading">Searching...</div>}
        {state.error && <div className="error">{state.error}</div>}
      </div>

      {/* Search Results */}
      {state.results && !state.selectedResult && (
        <SearchResults
          results={state.results}
          onResultClick={handleResultClick}
        />
      )}

      {/* Hierarchy View */}
      {state.selectedResult && (
        <HierarchyView
          hierarchy={state.selectedResult.hierarchy}
          type={state.selectedResult.type}
          onBack={() => setState(prev => ({ ...prev, selectedResult: null }))}
        />
      )}
    </div>
  );
};
```

---

## Summary

### Key Points

1. **Search Flow**:
   - User types → Debounced API call → Display category-wise results → Click result → Show hierarchy

2. **API Endpoints**:
   - `GET /api/search` - Global search (includes entities, users, profiles, roles, meters)
   - `GET /api/search/:type/:id/hierarchy` - Get path (returns path-only, no siblings)

3. **Response Structure**:
   - Category-wise grouped results (including meters)
   - Pagination metadata
   - **Path array** (not tree) starting from user's entity
   - Selected resource marked with `isSelected: true`

4. **Path Behavior**:
   - **Returns ONLY the exact path** - no siblings, no other children
   - **Always starts from logged-in user's entity** (not from selected resource)
   - Root Admin sees path from ETL Admin
   - KMP Admin sees path from KMP Energy
   - Ideal Energy Admin sees path from Ideal Energy
   - Selected resource is highlighted with `isSelected: true` in the path array
   - Returns linear path: `[Entity1, Entity2, Entity3, SelectedResource]`
   - Example: Ritik → KMP Admin → Patanjali Customer → X Consumer → Meter X

5. **Best Practices**:
   - Implement debouncing (300ms)
   - Handle errors gracefully
   - Show loading states
   - Cache recent searches
   - Optimize for mobile
   - Highlight selected resource in hierarchy view

6. **Access Control**:
   - All endpoints require authentication
   - Results are filtered by user's accessible entities
   - Hierarchy access is validated
   - Users can only see hierarchies within their accessible scope

---

## Testing Checklist

- [ ] Search with empty query (should not make API call)
- [ ] Search with valid query (should return results)
- [ ] Search with type filter (should filter results)
- [ ] Click on entity result (should show path)
- [ ] Click on user result (should show path)
- [ ] Click on profile result (should show path)
- [ ] Click on role result (should show path)
- [ ] Click on meter result (should show path)
- [ ] Verify path shows only direct path (no siblings)
- [ ] Verify path starts from logged-in user's entity
- [ ] Test pagination (load more results)
- [ ] Test error handling (invalid query, network error)
- [ ] Test unauthorized access (should redirect to login)
- [ ] Test access denied (should show error message)
- [ ] Test mobile responsiveness
- [ ] Test debouncing (should not make excessive calls)

---

This documentation provides everything needed to integrate the Global Search API into your frontend application. Follow the step-by-step guide and use the provided examples to implement the search functionality.

