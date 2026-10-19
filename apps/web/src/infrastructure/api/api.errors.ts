/**
 * Centralized API Error Classification & Normalization.
 * Transforms raw HTTP/network failures into typed, actionable domain errors.
 */

import { BackendErrorResponse } from "./api.types";

export class AppApiError extends Error {
  public readonly status: number;
  public readonly category?: string;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;

  constructor(params: {
    message: string;
    status: number;
    category?: string;
    details?: unknown;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(params.message);
    this.name = "AppApiError";
    this.status = params.status;
    this.category = params.category;
    this.details = params.details;
    this.isNetworkError = params.isNetworkError ?? false;
    this.isTimeout = params.isTimeout ?? false;
  }
}

export class NetworkConnectionError extends AppApiError {
  constructor(message = "Unable to connect to backend API. Please check your network or verify the server is running.") {
    super({
      message,
      status: 0,
      category: "unreachable",
      isNetworkError: true,
    });
    this.name = "NetworkConnectionError";
  }
}

export class TimeoutApiError extends AppApiError {
  constructor(timeoutMs: number) {
    super({
      message: `Request timed out after ${timeoutMs / 1000} seconds. The operation was aborted.`,
      status: 408,
      category: "timeout",
      isTimeout: true,
    });
    this.name = "TimeoutApiError";
  }
}

export class ValidationApiError extends AppApiError {
  public readonly fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string>, details?: unknown) {
    super({
      message,
      status: 422,
      category: "validation_error",
      details,
    });
    this.name = "ValidationApiError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Normalizes any caught error into a standardized AppApiError instance.
 */
export function normalizeApiError(error: unknown, fallbackMessage = "An unexpected error occurred."): AppApiError {
  if (error instanceof AppApiError) {
    return error;
  }

  // Handle AbortError / Timeout
  if (error instanceof DOMException && error.name === "AbortError") {
    return new TimeoutApiError(15000);
  }

  // Handle generic JavaScript Error
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new TimeoutApiError(15000);
    }

    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return new NetworkConnectionError();
    }

    return new AppApiError({
      message: error.message || fallbackMessage,
      status: 0,
    });
  }

  return new AppApiError({
    message: typeof error === "string" ? error : fallbackMessage,
    status: 0,
  });
}

/**
 * Parses HTTP error response body and returns a typed AppApiError.
 */
export async function parseHttpErrorResponse(
  response: Response
): Promise<AppApiError> {
  const status = response.status;
  let message = `Request failed with status ${status} (${response.statusText})`;
  let category: string | undefined;
  let rawBody: unknown;

  try {
    const data: BackendErrorResponse = await response.json();
    rawBody = data;

    // FastAPI Validation Errors (HTTP 422)
    if (status === 422 && Array.isArray(data.detail)) {
      const fieldErrors: Record<string, string> = {};
      const messages: string[] = [];

      for (const err of data.detail) {
        const field = err.loc ? err.loc[err.loc.length - 1] : "field";
        fieldErrors[field] = err.msg;
        messages.push(`${field}: ${err.msg}`);
      }

      return new ValidationApiError(
        messages.length ? messages.join("; ") : "Validation failed on submitted payload.",
        fieldErrors,
        rawBody
      );
    }

    // Detail string
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (data.message && typeof data.message === "string") {
      message = data.message;
    }

    if (data.error_category && typeof data.error_category === "string") {
      category = data.error_category;
    }
  } catch {
    // Non-JSON response body
  }

  return new AppApiError({
    message,
    status,
    category,
    details: rawBody,
  });
}
