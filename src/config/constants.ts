export const METER_TYPES = {
  PHYSICAL: "PHYSICAL",
  VIRTUAL: "VIRTUAL",
  GROUP: "GROUP",
} as const

export const PERMISSIONS = {
  READ: "read",
  WRITE: "write",
} as const

export const MODULES = {
  ENTITY: "Entity",
  USER: "User",
  ROLE: "Role",
  PROFILE: "Profile",
  MODULE: "Module",
  METER: "Meter",
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Resource not found",
  INVALID_CREDENTIALS: "Invalid email or password",
  DUPLICATE_EMAIL: "Email already exists",
  DUPLICATE_MOBILE: "Mobile number already exists",
  INVALID_INPUT: "Invalid input data",
  DATABASE_ERROR: "Database operation failed",
  PERMISSION_DENIED: "You do not have permission to perform this action",
} as const

export const RESOURCE_TYPE_MAP: Record<string, string> = {
  users: "Users",
  user: "Users",
  meters: "Meters",
  meter: "Meters",
  profiles: "Profiles",
  profile: "Profiles",
  roles: "Roles",
  role: "Roles",
  entities: "Entities",
  entity: "Entities",
} as const

export const QUERY_VALIDATION = {
  PAGINATION: {
    MIN_PAGE: 1,
    MIN_LIMIT: 1,
    MAX_LIMIT: 100,
  },
  ENTITY_ID_SPECIAL_VALUES: ["null", ""] as const,
  BOOLEAN_TRUE_VALUES: ["true", "1"] as const,
  BOOLEAN_FALSE_VALUES: ["false", "0"] as const,
} as const
