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
      EXECUTE: (id: string) =>
        `/api/v1/connections/${encodeURIComponent(id)}/execute`,
      EXCLUDE_TABLE: (id: string, tableName: string, schema: string = "public") =>
        `/api/v1/connections/${encodeURIComponent(id)}/tables/${encodeURIComponent(
          tableName
        )}/exclude?schema=${encodeURIComponent(schema)}`,
      TABLE_ROWS: (
        id: string,
        tableName: string,
        params?: {
          schema?: string;
          page?: number;
          limit?: number;
          sort?: string;
          order?: "asc" | "desc";
        }
      ) => {
        const query = new URLSearchParams();
        if (params?.schema) query.set("schema", params.schema);
        if (params?.page) query.set("page", params.page.toString());
        if (params?.limit) query.set("limit", params.limit.toString());
        if (params?.sort) query.set("sort", params.sort);
        if (params?.order) query.set("order", params.order);
        const qs = query.toString();
        return `/api/v1/connections/${encodeURIComponent(id)}/tables/${encodeURIComponent(tableName)}/rows${qs ? `?${qs}` : ""}`;
      },
    },
  },
} as const;
