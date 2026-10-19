import { ConnectionCreatePayload, ConnectionPresetType, SSLMode } from "./connection.types";

export interface PresetConfig {
  id: ConnectionPresetType;
  label: string;
  description: string;
  defaults: Partial<ConnectionCreatePayload>;
  badgeText?: string;
  helperNotice?: string;
}

export const CONNECTION_PRESETS: Record<ConnectionPresetType, PresetConfig> = {
  local: {
    id: "local",
    label: "Local Database",
    description: "PostgreSQL on your machine, Docker container, or local LAN.",
    badgeText: "Plaintext / Dev",
    helperNotice:
      "Running in Docker? Use host.docker.internal as the host instead of localhost.",
    defaults: {
      name: "Local PostgreSQL",
      host: "localhost",
      port: 5432,
      database: "postgres",
      username: "postgres",
      password: "",
      ssl_mode: "disable" as SSLMode,
    },
  },
  cloud: {
    id: "cloud",
    label: "Cloud Database",
    description: "Managed instances like Supabase, Neon, AWS RDS, GCP Cloud SQL.",
    badgeText: "TLS Encrypted",
    helperNotice:
      "Cloud databases mandate TLS encryption. SSL Mode 'require' is preselected.",
    defaults: {
      name: "Cloud PostgreSQL",
      host: "ep-example.neon.tech",
      port: 5432,
      database: "neondb",
      username: "neondb_owner",
      password: "",
      ssl_mode: "require" as SSLMode,
    },
  },
  custom: {
    id: "custom",
    label: "Custom / Intranet",
    description: "Custom port, enterprise intranet, or custom self-signed CA certificates.",
    badgeText: "Advanced",
    helperNotice:
      "Supports 'verify-ca' and 'verify-full' with custom PEM root certificates.",
    defaults: {
      name: "Enterprise PostgreSQL",
      host: "192.168.1.50",
      port: 5432,
      database: "app_production",
      username: "readonly_user",
      password: "",
      ssl_mode: "verify-ca" as SSLMode,
    },
  },
};
