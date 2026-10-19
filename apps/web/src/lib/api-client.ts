/**
 * Re-export centralized API client and error models for backward compatibility.
 */

export {
  apiClient,
  ApiClient,
  AppApiError as ApiError,
  NetworkConnectionError,
  TimeoutApiError,
  ValidationApiError,
  API_ENDPOINTS,
} from "@/infrastructure/api";
