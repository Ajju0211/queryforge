/**
 * Centralized System & Health API Service.
 * Provides connectivity diagnostics and status probes for QueryForge AI.
 */

import { apiClient, API_ENDPOINTS } from "../api";

export interface BackendHealthStatus {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  environment: string;
  latencyMs: number;
}

export class SystemApiService {
  /**
   * Probes the backend API health check endpoint and measures response latency.
   */
  public async checkHealth(): Promise<BackendHealthStatus> {
    const startTime = performance.now();

    const response = await apiClient.get<{
      status: string;
      service: string;
      version: string;
      environment: string;
    }>(API_ENDPOINTS.SYSTEM.HEALTH, {
      timeoutMs: 5000,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      status: response.status === "ok" ? "ok" : "degraded",
      service: response.service,
      version: response.version,
      environment: response.environment,
      latencyMs,
    };
  }
}

export const systemApiService = new SystemApiService();
