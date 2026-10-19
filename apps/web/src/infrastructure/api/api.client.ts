/**
 * Centralized Type-Safe API Client.
 * Enterprise HTTP client with interceptors, timeouts, error normalization, and query builders.
 */

import { apiConfig } from "./api.config";
import {
  AppApiError,
  normalizeApiError,
  parseHttpErrorResponse,
  TimeoutApiError,
} from "./api.errors";
import {
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "./api.types";

export class ApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    this.baseUrl = apiConfig.baseUrl;
    this.defaultTimeoutMs = apiConfig.defaultTimeoutMs;
    this.defaultHeaders = { ...apiConfig.headers };
  }

  /**
   * Registers a request interceptor to inspect or mutate outgoing requests.
   */
  public addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(
        (i) => i !== interceptor
      );
    };
  }

  /**
   * Registers a response interceptor to inspect or transform incoming responses.
   */
  public addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(
        (i) => i !== interceptor
      );
    };
  }

  /**
   * Constructs the full URL from endpoint and optional query params.
   */
  private buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): string {
    const isAbsolute = /^https?:\/\//i.test(endpoint);
    let resolvedUrl = isAbsolute
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        resolvedUrl += `${resolvedUrl.includes("?") ? "&" : "?"}${queryString}`;
      }
    }

    return resolvedUrl;
  }

  /**
   * Core request dispatcher with interceptors, timeout, and error normalization.
   */
  private async executeRequest<T>(
    endpoint: string,
    method: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params,
      timeoutMs = this.defaultTimeoutMs,
      skipErrorNormalization = false,
      headers: customHeaders = {},
      ...restOptions
    } = options;

    let targetUrl = this.buildUrl(endpoint, params);

    // Prepare headers
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(customHeaders as Record<string, string>),
    };

    // Setup AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    let initOptions: RequestInit = {
      ...restOptions,
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      initOptions.body = JSON.stringify(body);
    }

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      const intercepted = await interceptor(targetUrl, initOptions);
      targetUrl = intercepted.url;
      initOptions = intercepted.options;
    }

    try {
      let response = await fetch(targetUrl, initOptions);
      clearTimeout(timeoutId);

      // Run response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      if (!response.ok) {
        const error = await parseHttpErrorResponse(response);
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      // Parse JSON response
      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Handle explicit abort timeout
      if (err instanceof DOMException && err.name === "AbortError") {
        const timeoutError = new TimeoutApiError(timeoutMs);
        if (skipErrorNormalization) throw timeoutError;
        throw timeoutError;
      }

      if (skipErrorNormalization && err instanceof AppApiError) {
        throw err;
      }

      throw normalizeApiError(err);
    }
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(endpoint, "GET", undefined, options);
  }

  public post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>(endpoint, "POST", body, options);
  }

  public put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>(endpoint, "PUT", body, options);
  }

  public patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.executeRequest<T>(endpoint, "PATCH", body, options);
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.executeRequest<T>(endpoint, "DELETE", undefined, options);
  }
}

// Global centralized singleton instance
export const apiClient = new ApiClient();
