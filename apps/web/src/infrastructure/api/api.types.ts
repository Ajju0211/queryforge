/**
 * Centralized API Types & Contracts.
 */

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  skipErrorNormalization?: boolean;
}

export type RequestInterceptor = (
  url: string,
  options: RequestInit
) => Promise<{ url: string; options: RequestInit }> | { url: string; options: RequestInit };

export type ResponseInterceptor = (
  response: Response
) => Promise<Response> | Response;

export interface BackendErrorResponse {
  detail?: string | Array<{ loc: string[]; msg: string; type: string }>;
  error_category?: string;
  message?: string;
  [key: string]: unknown;
}
