"use client";

import { useState } from "react";
import { ConnectionCreatePayload, ConnectionTestResult } from "../models/connection.types";
import { defaultConnectionRepository } from "@/infrastructure/repositories/connection.http-repository";
import { IConnectionRepository } from "../repositories/connection.repository";

export interface UseConnectionTestReturn {
  isTesting: boolean;
  testResult: ConnectionTestResult | null;
  runTest: (payload: ConnectionCreatePayload) => Promise<ConnectionTestResult>;
  resetTest: () => void;
}

/**
 * Custom hook managing ad-hoc target database connectivity probes.
 * Single Responsibility: Isolated testing state machine and latency reporting.
 */
export function useConnectionTest(
  repository: IConnectionRepository = defaultConnectionRepository
): UseConnectionTestReturn {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const resetTest = () => {
    setTestResult(null);
  };

  const runTest = async (payload: ConnectionCreatePayload): Promise<ConnectionTestResult> => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await repository.testConnection({
        host: payload.host,
        port: Number(payload.port),
        database: payload.database,
        username: payload.username,
        password: payload.password,
        ssl_mode: payload.ssl_mode,
        custom_ca_cert: payload.custom_ca_cert,
      });

      setTestResult(res);
      setIsTesting(false);
      return res;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Connection probe failed unexpectedly.";
      const failureResult: ConnectionTestResult = {
        success: false,
        message: msg,
        error_category: "network_error",
        latency_ms: null,
      };
      setTestResult(failureResult);
      setIsTesting(false);
      return failureResult;
    }
  };

  return {
    isTesting,
    testResult,
    runTest,
    resetTest,
  };
}
