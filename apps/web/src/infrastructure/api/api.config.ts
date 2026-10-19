/**
 * Centralized API Configuration.
 * Single Source of Truth for environment endpoints, timeouts, and headers.
 */

export interface ApiConfig {
  baseUrl: string;
  defaultTimeoutMs: number;
  introspectionTimeoutMs: number;
  headers: Record<string, string>;
}

function resolveBaseUrl(): string {
  // If explicitly configured via environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // Browser context fallback: use relative path to leverage Next.js rewrite proxy
  if (typeof window !== "undefined") {
    return "";
  }

  // Server context default
  return "http://localhost:8000";
}

export const apiConfig: ApiConfig = {
  baseUrl: resolveBaseUrl(),
  defaultTimeoutMs: 15000, // 15 seconds default timeout
  introspectionTimeoutMs: 60000, // 60 seconds for heavy catalog introspection
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};
