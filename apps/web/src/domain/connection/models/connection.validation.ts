import { ConnectionCreatePayload, ConnectionEntity, ConnectionPresetType } from "./connection.types";

export type ConnectionFieldErrors = Partial<Record<keyof ConnectionCreatePayload, string>>;

const LOCAL_HOST_ALIASES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"]);

/**
 * Validates connection payload fields and returns inline field-level errors.
 * Ensures strict compliance with PostgreSQL connection constraints and duplicate detection.
 */
export function validateConnectionPayload(
  payload: ConnectionCreatePayload,
  selectedPreset?: ConnectionPresetType,
  existingConnections: ConnectionEntity[] = []
): ConnectionFieldErrors {
  const errors: ConnectionFieldErrors = {};

  // 1. Connection Name Validation & Duplicate Name Detection
  const name = payload.name?.trim() || "";
  if (!name) {
    errors.name = "Connection name is required.";
  } else if (name.length > 255) {
    errors.name = "Connection name cannot exceed 255 characters.";
  } else if (
    existingConnections.some(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase()
    )
  ) {
    errors.name = `A connection named "${name}" already exists. Please choose a different name.`;
  }

  // 2. Host Validation & Port Suffix Detection
  const host = payload.host?.trim() || "";
  if (!host) {
    errors.host = "Host or endpoint is required.";
  } else if (host.startsWith("http://") || host.startsWith("https://")) {
    errors.host = "Enter hostname or IP address only, without 'http://' or 'https://'.";
  } else if (host.startsWith("postgresql://") || host.startsWith("postgres://")) {
    errors.host = "Enter hostname or IP only, without connection URI scheme.";
  } else if (host.includes(":") && !host.startsWith("[")) {
    // Detects pasted host:port like "localhost:5432"
    errors.host = "Enter hostname only (without port). Specify the port in the Port field.";
  } else if (/\s/.test(host)) {
    errors.host = "Host cannot contain whitespace.";
  }

  // 3. Port Validation
  const port = Number(payload.port);
  if (payload.port === undefined || payload.port === null || isNaN(port)) {
    errors.port = "Port is required (default 5432).";
  } else if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.port = "Port must be a valid port number between 1 and 65535.";
  }

  // 4. Database Name Validation & Duplicate Target Endpoint Detection
  const database = payload.database?.trim() || "";
  if (!database) {
    errors.database = "Database name is required.";
  } else if (/\s/.test(database)) {
    errors.database = "Database name cannot contain whitespace.";
  } else if (database.length > 255) {
    errors.database = "Database name cannot exceed 255 characters.";
  } else if (host && port) {
    // Check if target database endpoint (host, port, db) is already connected
    const isLocal = LOCAL_HOST_ALIASES.has(host.toLowerCase());
    const duplicateConn = existingConnections.find((c) => {
      const cIsLocal = LOCAL_HOST_ALIASES.has(c.host.trim().toLowerCase());
      const hostMatch = isLocal && cIsLocal
        ? true
        : c.host.trim().toLowerCase() === host.toLowerCase();
      const portMatch = Number(c.port) === port;
      const dbMatch = c.database.trim().toLowerCase() === database.toLowerCase();
      return hostMatch && portMatch && dbMatch;
    });

    if (duplicateConn) {
      errors.database = `Database "${database}" on ${host}:${port} is already connected as "${duplicateConn.name}".`;
    }
  }

  // 5. Username Validation
  const username = payload.username?.trim() || "";
  if (!username) {
    errors.username = "Username is required.";
  } else if (username.length > 255) {
    errors.username = "Username cannot exceed 255 characters.";
  }

  // 6. Password Validation
  // Cloud providers (Neon, Supabase, RDS) mandate password
  if (selectedPreset === "cloud" && (!payload.password || !payload.password.trim())) {
    errors.password = "Password is required for cloud database connections.";
  }

  // 7. Custom CA Certificate Validation
  if (payload.custom_ca_cert && payload.custom_ca_cert.trim()) {
    const cert = payload.custom_ca_cert.trim();
    if (!cert.includes("-----BEGIN CERTIFICATE-----") || !cert.includes("-----END CERTIFICATE-----")) {
      errors.custom_ca_cert = "Certificate must be in valid PEM format starting with -----BEGIN CERTIFICATE-----.";
    }
  }

  return errors;
}

/**
 * Maps a diagnostic error category from connection probe test to the most likely offending form field.
 */
export function mapErrorCategoryToField(
  category?: string | null
): { field: keyof ConnectionCreatePayload; message: string } | null {
  if (!category) return null;

  switch (category) {
    case "duplicate_name":
      return {
        field: "name",
        message: "A connection with this name already exists. Please choose a different name.",
      };
    case "duplicate_database":
      return {
        field: "database",
        message: "This database is already connected.",
      };
    case "authentication":
      return {
        field: "password",
        message: "Authentication failed. Please verify your database username and password.",
      };
    case "unreachable":
      return {
        field: "host",
        message: "Host is unreachable. Verify hostname, port, or Docker network configuration.",
      };
    case "database_not_found":
      return {
        field: "database",
        message: "Database does not exist on target PostgreSQL server.",
      };
    case "ssl_mismatch":
      return {
        field: "ssl_mode",
        message: "SSL negotiation failed. For local Docker databases, select 'disable'. For cloud, select 'require'.",
      };
    default:
      return null;
  }
}
