"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BackendHealthStatus,
  systemApiService,
} from "@/infrastructure/services/system.api";

export interface UseApiHealthReturn {
  isChecking: boolean;
  isOnline: boolean;
  health: BackendHealthStatus | null;
  errorMessage: string | null;
  checkHealth: () => Promise<void>;
}

export function useApiHealth(): UseApiHealthReturn {
  const [isChecking, setIsChecking] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [health, setHealth] = useState<BackendHealthStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setErrorMessage(null);

    try {
      const data = await systemApiService.checkHealth();
      setHealth(data);
      setIsOnline(true);
    } catch (err: unknown) {
      setIsOnline(false);
      setHealth(null);
      const msg =
        err instanceof Error
          ? err.message
          : "Backend API is unreachable. Ensure Uvicorn server is running on port 8000.";
      setErrorMessage(msg);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    systemApiService
      .checkHealth()
      .then((data) => {
        if (!isCancelled) {
          setHealth(data);
          setIsOnline(true);
          setIsChecking(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setIsOnline(false);
          setHealth(null);
          const msg =
            err instanceof Error
              ? err.message
              : "Backend API is unreachable.";
          setErrorMessage(msg);
          setIsChecking(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    isChecking,
    isOnline,
    health,
    errorMessage,
    checkHealth,
  };
}
