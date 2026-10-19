/**
 * Centralized API Endpoints Catalog.
 * Single Source of Truth for all URL paths, versioned endpoints, and parameter builders.
 */

export const API_ENDPOINTS = {
  // System & Health
  SYSTEM: {
    HEALTH: "/health",
    ROOT: "/",
  },

  // Version 1 Endpoints
  V1: {
    CONNECTIONS: {
      BASE: "/api/v1/connections",
      TEST: "/api/v1/connections/test",
      BY_ID: (id: string) => `/api/v1/connections/${encodeURIComponent(id)}`,
      SCHEMA: (id: string) => `/api/v1/connections/${encodeURIComponent(id)}/schema`,
      REFRESH_SCHEMA: (id: string) =>
        `/api/v1/connections/${encodeURIComponent(id)}/refresh-schema`,
      EXCLUDE_TABLE: (id: string, tableName: string, schema: string = "public") =>
        `/api/v1/connections/${encodeURIComponent(id)}/tables/${encodeURIComponent(
          tableName
        )}/exclude?schema=${encodeURIComponent(schema)}`,
    },
  },
} as const;
