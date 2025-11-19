# 🔍 Global Search API - Frontend Integration Guide

## Overview

This guide provides complete documentation for integrating the Global Search API into your frontend application. The search API allows users to search across **Entities**, **Users**, **Profiles**, and **Roles** with category-wise results and hierarchy support.

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

**Purpose**: Search across all resource types (Entities, Users, Profiles, Roles)

**Authentication**: Required (JWT token in Authorization header)

**Query Parameters**:
- `q` (required): Search query string (min 1, max 255 characters)
- `type` (optional): Filter by resource type(s)
  - Single: `type=entity`
  - Multiple: `type=entity,user`
  - Valid values: `entity`, `user`, `profile`, `role`
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
```

---

### 2. Get Hierarchy Endpoint

**Endpoint**: `GET /api/search/:type/:id/hierarchy`

**Purpose**: Get complete hierarchy for a selected search result

**Authentication**: Required (JWT token in Authorization header)

**Path Parameters**:
- `type`: Resource type (`entity`, `user`, `profile`, `role`)
- `id`: Resource ID (UUID)

**Query Parameters**:
- `depth` (optional): Maximum depth levels (default: unlimited)
- `page` (optional): Page number (for paginated root children)
- `limit` (optional): Items per page (for paginated root children)
- `paginateRootChildren` (optional): Enable pagination for root's direct children (boolean)

**Example Requests**:
```bash
# Get entity hierarchy
GET /api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy

# Get user hierarchy with depth limit
GET /api/search/user/550e8400-e29b-41d4-a716-446655440000/hierarchy?depth=3

# Get profile hierarchy
GET /api/search/profile/550e8400-e29b-41d4-a716-446655440000/hierarchy
```

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
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Display hierarchy tree view                               │
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
        placeholder="Search entities, users, profiles, roles..."
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
  type: 'entity' | 'user' | 'profile' | 'role',
  id: string,
  depth?: number
) => {
  const url = `/api/search/${type}/${id}/hierarchy${depth ? `?depth=${depth}` : ''}`;
  
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
interface HierarchyViewProps {
  hierarchy: EntityHierarchy | UserHierarchy | ProfileHierarchy | RoleHierarchy;
  type: string;
}

export const HierarchyView = ({ hierarchy, type }: HierarchyViewProps) => {
  const renderEntityHierarchy = (entity: EntityHierarchy, level = 0) => {
    return (
      <div key={entity.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="hierarchy-item">
          <span className="hierarchy-icon">📁</span>
          <span className="hierarchy-name">{entity.name}</span>
          <span className="hierarchy-meta">{entity.email_id}</span>
        </div>
        {entity.children && entity.children.map((child) => 
          renderEntityHierarchy(child, level + 1)
        )}
      </div>
    );
  };

  const renderUserHierarchy = (user: UserHierarchy, level = 0) => {
    return (
      <div key={user.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="hierarchy-item">
          <span className="hierarchy-icon">👤</span>
          <span className="hierarchy-name">{user.name}</span>
          <span className="hierarchy-meta">{user.email}</span>
          {user.entity && (
            <span className="hierarchy-entity">({user.entity.name})</span>
          )}
        </div>
        {user.children && user.children.map((child) => 
          renderUserHierarchy(child, level + 1)
        )}
      </div>
    );
  };

  const renderProfileHierarchy = (profile: ProfileHierarchy) => {
    return (
      <div>
        <div className="hierarchy-item">
          <span className="hierarchy-icon">📋</span>
          <span className="hierarchy-name">{profile.name}</span>
        </div>
        {profile.entity && (
          <div style={{ marginLeft: '20px' }}>
            <h4>Entity Hierarchy:</h4>
            {renderEntityHierarchy(profile.entity)}
          </div>
        )}
      </div>
    );
  };

  const renderRoleHierarchy = (role: RoleHierarchy) => {
    return (
      <div>
        <div className="hierarchy-item">
          <span className="hierarchy-icon">🔐</span>
          <span className="hierarchy-name">{role.name}</span>
        </div>
        {role.entity && (
          <div style={{ marginLeft: '20px' }}>
            <h4>Entity Hierarchy:</h4>
            {renderEntityHierarchy(role.entity)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hierarchy-view">
      {type === 'entity' && renderEntityHierarchy(hierarchy as EntityHierarchy)}
      {type === 'user' && renderUserHierarchy(hierarchy as UserHierarchy)}
      {type === 'profile' && renderProfileHierarchy(hierarchy as ProfileHierarchy)}
      {type === 'role' && renderRoleHierarchy(hierarchy as RoleHierarchy)}
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

### Example 3: Get Entity Hierarchy

**Request**:
```http
GET /api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy?depth=3
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Entity hierarchy retrieved",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "KMP Energy",
    "email_id": "contact@kmpenergy.com",
    "mobile_no": "+1234567890",
    "entity_id": null,
    "profile_id": "770e8400-e29b-41d4-a716-446655440002",
    "attributes": null,
    "created_by": "880e8400-e29b-41d4-a716-446655440003",
    "creation_time": "2024-01-15T10:30:00Z",
    "last_update_on": "2024-01-15T10:30:00Z",
    "children": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Ideal Energy",
        "email_id": "contact@idealenergy.com",
        "mobile_no": "+1234567891",
        "entity_id": "550e8400-e29b-41d4-a716-446655440000",
        "profile_id": "770e8400-e29b-41d4-a716-446655440002",
        "attributes": null,
        "created_by": "880e8400-e29b-41d4-a716-446655440003",
        "creation_time": "2024-01-16T10:30:00Z",
        "last_update_on": "2024-01-16T10:30:00Z",
        "children": [
          {
            "id": "770e8400-e29b-41d4-a716-446655440004",
            "name": "Patanjali Energy",
            "email_id": "contact@patanjali.com",
            "mobile_no": "+1234567892",
            "entity_id": "660e8400-e29b-41d4-a716-446655440001",
            "profile_id": "770e8400-e29b-41d4-a716-446655440002",
            "attributes": null,
            "created_by": "880e8400-e29b-41d4-a716-446655440003",
            "creation_time": "2024-01-17T10:30:00Z",
            "last_update_on": "2024-01-17T10:30:00Z",
            "children": []
          }
        ]
      }
    ]
  },
  "timestamp": 1705564800000,
  "path": "/api/search/entity/550e8400-e29b-41d4-a716-446655440000/hierarchy"
}
```

---

### Example 4: Get User Hierarchy

**Request**:
```http
GET /api/search/user/990e8400-e29b-41d4-a716-446655440004/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "User hierarchy retrieved",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "entity_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "mobile_no": "+1234567891",
    "name": "John Doe",
    "is_active": true,
    "is_deleted": false,
    "attributes": null,
    "created_by": null,
    "creation_time": "2024-01-16T09:00:00Z",
    "last_update_on": "2024-01-16T09:00:00Z",
    "role_id": "bb0e8400-e29b-41d4-a716-446655440006",
    "children": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440005",
        "entity_id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "jane.smith@example.com",
        "mobile_no": "+1234567892",
        "name": "Jane Smith",
        "is_active": true,
        "is_deleted": false,
        "attributes": null,
        "created_by": "990e8400-e29b-41d4-a716-446655440004",
        "creation_time": "2024-01-17T09:00:00Z",
        "last_update_on": "2024-01-17T09:00:00Z",
        "role_id": "bb0e8400-e29b-41d4-a716-446655440006",
        "children": []
      }
    ],
    "entity": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "KMP Energy"
    }
  },
  "timestamp": 1705564800000,
  "path": "/api/search/user/990e8400-e29b-41d4-a716-446655440004/hierarchy"
}
```

---

### Example 5: Get Profile Hierarchy

**Request**:
```http
GET /api/search/profile/cc0e8400-e29b-41d4-a716-446655440007/hierarchy
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile hierarchy retrieved",
  "data": {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "name": "John's Profile",
    "entity_id": "550e8400-e29b-41d4-a716-446655440000",
    "attributes": null,
    "created_by": "dd0e8400-e29b-41d4-a716-446655440008",
    "creation_time": "2024-01-17T08:00:00Z",
    "last_update_on": "2024-01-17T08:00:00Z",
    "entity": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "KMP Energy",
      "children": [
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "name": "Ideal Energy",
          "children": []
        }
      ]
    }
  },
  "timestamp": 1705564800000,
  "path": "/api/search/profile/cc0e8400-e29b-41d4-a716-446655440007/hierarchy"
}
```

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
  "error": "Invalid resource type. Must be one of: entity, user, profile, role",
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

### 3. Hierarchy View

- **Tree Structure**: Use indentation or tree lines to show hierarchy
- **Expand/Collapse**: Allow users to expand/collapse branches
- **Icons**: Use different icons for different resource types
  - 📁 for Entities
  - 👤 for Users
  - 📋 for Profiles
  - 🔐 for Roles
- **Breadcrumbs**: Show path to current item
- **Loading State**: Show loading indicator while fetching hierarchy

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
          placeholder="Search entities, users, profiles, roles..."
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
   - `GET /api/search` - Global search
   - `GET /api/search/:type/:id/hierarchy` - Get hierarchy

3. **Response Structure**:
   - Category-wise grouped results
   - Pagination metadata
   - Hierarchy tree structure

4. **Best Practices**:
   - Implement debouncing (300ms)
   - Handle errors gracefully
   - Show loading states
   - Cache recent searches
   - Optimize for mobile

5. **Access Control**:
   - All endpoints require authentication
   - Results are filtered by user's accessible entities
   - Hierarchy access is validated

---

## Testing Checklist

- [ ] Search with empty query (should not make API call)
- [ ] Search with valid query (should return results)
- [ ] Search with type filter (should filter results)
- [ ] Click on entity result (should show hierarchy)
- [ ] Click on user result (should show hierarchy)
- [ ] Click on profile result (should show hierarchy)
- [ ] Click on role result (should show hierarchy)
- [ ] Test pagination (load more results)
- [ ] Test error handling (invalid query, network error)
- [ ] Test unauthorized access (should redirect to login)
- [ ] Test access denied (should show error message)
- [ ] Test mobile responsiveness
- [ ] Test debouncing (should not make excessive calls)

---

This documentation provides everything needed to integrate the Global Search API into your frontend application. Follow the step-by-step guide and use the provided examples to implement the search functionality.

