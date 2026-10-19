/**
 * Public exports for the Centralized Infrastructure API Layer.
 */

export { apiConfig } from "./api.config";
export type { ApiConfig } from "./api.config";

export { API_ENDPOINTS } from "./api.endpoints";

export {
  AppApiError,
  NetworkConnectionError,
  TimeoutApiError,
  ValidationApiError,
  normalizeApiError,
  parseHttpErrorResponse,
} from "./api.errors";

export { ApiClient, apiClient } from "./api.client";

export type {
  RequestOptions,
  RequestInterceptor,
  ResponseInterceptor,
  BackendErrorResponse,
} from "./api.types";
