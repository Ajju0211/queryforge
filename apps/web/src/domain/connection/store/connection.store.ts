import { create } from "zustand";
import {
  ConnectionCreatePayload,
  ConnectionEntity,
  ConnectionPresetType,
  SchemaGraph,
} from "../models/connection.types";
import { CONNECTION_PRESETS } from "../models/preset.constants";
import { defaultConnectionRepository } from "@/infrastructure/repositories/connection.http-repository";
import { IConnectionRepository } from "../repositories/connection.repository";
import { AppApiError, ValidationApiError } from "@/infrastructure/api/api.errors";

interface ConnectionState {
  // Data State
  connections: ConnectionEntity[];
  activeConnection: ConnectionEntity | null;
  activeSchema: SchemaGraph | null;

  // UI / Modal State
  isModalOpen: boolean;
  selectedPreset: ConnectionPresetType;
  formData: ConnectionCreatePayload;

  // Async Statuses
  isLoadingConnections: boolean;
  isLoadingSchema: boolean;
  isSavingConnection: boolean;
  isRefreshingSchema: boolean;
  errorMessage: string | null;

  // Actions
  setModalOpen: (isOpen: boolean) => void;
  setSelectedPreset: (preset: ConnectionPresetType) => void;
  updateFormField: <K extends keyof ConnectionCreatePayload>(
    key: K,
    value: ConnectionCreatePayload[K]
  ) => void;
  resetForm: () => void;
  setActiveConnection: (connection: ConnectionEntity | null) => void;
  clearError: () => void;

  // Async Domain Operations
  fetchConnections: (repo?: IConnectionRepository) => Promise<void>;
  selectConnection: (
    connectionId: string,
    repo?: IConnectionRepository
  ) => Promise<void>;
  createConnection: (
    repo?: IConnectionRepository
  ) => Promise<{
    success: boolean;
    message?: string;
    category?: string;
    fieldErrors?: Record<string, string>;
  }>;
  refreshSchema: (repo?: IConnectionRepository) => Promise<void>;
  toggleTableExclusion: (
    tableName: string,
    isExcluded: boolean,
    schema?: string,
    repo?: IConnectionRepository
  ) => Promise<void>;
  deleteConnection: (
    connectionId: string,
    repo?: IConnectionRepository
  ) => Promise<boolean>;
}

const initialFormData: ConnectionCreatePayload = {
  name: CONNECTION_PRESETS.local.defaults.name || "Local PostgreSQL",
  host: CONNECTION_PRESETS.local.defaults.host || "localhost",
  port: CONNECTION_PRESETS.local.defaults.port || 5432,
  database: CONNECTION_PRESETS.local.defaults.database || "postgres",
  username: CONNECTION_PRESETS.local.defaults.username || "postgres",
  password: "",
  ssl_mode: CONNECTION_PRESETS.local.defaults.ssl_mode || "disable",
  custom_ca_cert: null,
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnection: null,
  activeSchema: null,

  isModalOpen: false,
  selectedPreset: "local",
  formData: initialFormData,

  isLoadingConnections: false,
  isLoadingSchema: false,
  isSavingConnection: false,
  isRefreshingSchema: false,
  errorMessage: null,

  setModalOpen: (isOpen: boolean) => {
    set({ isModalOpen: isOpen, errorMessage: null });
    if (!isOpen) {
      get().resetForm();
    }
  },

  setSelectedPreset: (preset: ConnectionPresetType) => {
    const config = CONNECTION_PRESETS[preset];
    const connections = get().connections;
    const baseName = config.defaults.name || "PostgreSQL";
    let candidateName = baseName;
    let counter = 2;
    while (connections.some((c) => c.name.trim().toLowerCase() === candidateName.toLowerCase())) {
      candidateName = `${baseName} ${counter++}`;
    }

    set((state) => ({
      selectedPreset: preset,
      formData: {
        ...state.formData,
        ...config.defaults,
        name: candidateName,
        password: state.formData.password, // preserve current password input
      },
    }));
  },

  updateFormField: (key, value) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [key]: value,
      },
    }));
  },

  resetForm: () => {
    const preset = get().selectedPreset;
    const config = CONNECTION_PRESETS[preset];
    const connections = get().connections;
    const baseName = config.defaults.name || "PostgreSQL";
    let candidateName = baseName;
    let counter = 2;
    while (connections.some((c) => c.name.trim().toLowerCase() === candidateName.toLowerCase())) {
      candidateName = `${baseName} ${counter++}`;
    }

    set({
      formData: {
        ...initialFormData,
        ...config.defaults,
        name: candidateName,
        password: "",
      },
      errorMessage: null,
    });
  },

  setActiveConnection: (connection) => {
    set({ activeConnection: connection, errorMessage: null });
    if (connection) {
      get().selectConnection(connection.id);
    } else {
      set({ activeSchema: null });
    }
  },

  clearError: () => set({ errorMessage: null }),

  fetchConnections: async (repo = defaultConnectionRepository) => {
    set({ isLoadingConnections: true, errorMessage: null });
    try {
      const connections = await repo.listConnections();
      set({ connections, isLoadingConnections: false });

      // Automatically select the first active connection if none currently selected
      const currentActive = get().activeConnection;
      if (!currentActive && connections.length > 0) {
        const first = connections[0];
        set({ activeConnection: first });
        await get().selectConnection(first.id, repo);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load connections.";
      set({ isLoadingConnections: false, errorMessage: msg });
    }
  },

  selectConnection: async (connectionId: string, repo = defaultConnectionRepository) => {
    const currentList = get().connections;
    const match = currentList.find((c) => c.id === connectionId) || null;
    set({ activeConnection: match, isLoadingSchema: true, errorMessage: null });

    try {
      const schema = await repo.getSchema(connectionId);
      set({ activeSchema: schema, isLoadingSchema: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load schema.";
      set({ isLoadingSchema: false, errorMessage: msg });
    }
  },

  createConnection: async (repo = defaultConnectionRepository) => {
    const form = get().formData;
    set({ isSavingConnection: true, errorMessage: null });

    try {
      const result = await repo.createConnection(form);
      const newConn = result.connection;
      const schema = result.schema_graph || null;

      set((state) => ({
        connections: [newConn, ...state.connections],
        activeConnection: newConn,
        activeSchema: schema,
        isSavingConnection: false,
        isModalOpen: false,
      }));

      get().resetForm();
      return { success: true };
    } catch (err: unknown) {
      let msg = "Failed to create connection.";
      let fieldErrors: Record<string, string> | undefined;
      let category: string | undefined;

      if (err instanceof ValidationApiError) {
        fieldErrors = err.fieldErrors;
        msg = err.message;
        category = err.category;
      } else if (err instanceof AppApiError) {
        msg = err.message;
        category = err.category;
      } else if (err instanceof Error) {
        msg = err.message;
      }

      set({ isSavingConnection: false, errorMessage: msg });
      return {
        success: false,
        message: msg,
        category,
        fieldErrors,
      };
    }
  },

  refreshSchema: async (repo = defaultConnectionRepository) => {
    const active = get().activeConnection;
    if (!active) return;

    set({ isRefreshingSchema: true, errorMessage: null });
    try {
      const updatedSchema = await repo.refreshSchema(active.id);
      set({ activeSchema: updatedSchema, isRefreshingSchema: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh schema.";
      set({ isRefreshingSchema: false, errorMessage: msg });
      throw err;
    }
  },

  toggleTableExclusion: async (
    tableName: string,
    isExcluded: boolean,
    schema = "public",
    repo = defaultConnectionRepository
  ) => {
    const active = get().activeConnection;
    if (!active) return;

    // Optimistically update schema in store
    const currentSchema = get().activeSchema;
    if (currentSchema) {
      const updatedTables = currentSchema.tables.map((t) => {
        if (t.name === tableName && (t.schema === schema || !schema)) {
          return { ...t, is_excluded: isExcluded };
        }
        return t;
      });
      set({
        activeSchema: {
          ...currentSchema,
          tables: updatedTables,
        },
      });
    }

    try {
      await repo.toggleTableExclusion(active.id, tableName, isExcluded, schema);
    } catch (err: unknown) {
      // Revert on failure
      if (currentSchema) {
        set({ activeSchema: currentSchema });
      }
      const msg = err instanceof Error ? err.message : "Failed to update table exclusion.";
      set({ errorMessage: msg });
      throw err;
    }
  },

  deleteConnection: async (connectionId: string, repo = defaultConnectionRepository) => {
    try {
      await repo.deleteConnection(connectionId);
      const remaining = get().connections.filter((c) => c.id !== connectionId);
      const wasActive = get().activeConnection?.id === connectionId;

      set({
        connections: remaining,
        activeConnection: wasActive ? remaining[0] || null : get().activeConnection,
        activeSchema: wasActive ? null : get().activeSchema,
      });

      if (wasActive && remaining.length > 0) {
        await get().selectConnection(remaining[0].id, repo);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete connection.";
      set({ errorMessage: msg });
      return false;
    }
  },
}));
