"use client";

import { useEffect } from "react";
import { useConnectionStore } from "../store/connection.store";

/**
 * Custom hook providing access to connection management operations.
 * Single Responsibility: Facilitates clean UI interactions with the Connection store.
 */
export function useConnectionManager() {
  const {
    connections,
    activeConnection,
    activeSchema,
    isModalOpen,
    selectedPreset,
    formData,
    isLoadingConnections,
    isLoadingSchema,
    isSavingConnection,
    isRefreshingSchema,
    errorMessage,
    setModalOpen,
    setSelectedPreset,
    updateFormField,
    resetForm,
    setActiveConnection,
    clearError,
    fetchConnections,
    selectConnection,
    createConnection,
    refreshSchema,
    toggleTableExclusion,
    deleteConnection,
  } = useConnectionStore();

  // Load connections on initial mount
  useEffect(() => {
    if (connections.length === 0) {
      fetchConnections();
    }
  }, [fetchConnections, connections.length]);

  return {
    // State
    connections,
    activeConnection,
    activeSchema,
    isModalOpen,
    selectedPreset,
    formData,
    isLoadingConnections,
    isLoadingSchema,
    isSavingConnection,
    isRefreshingSchema,
    errorMessage,

    // Actions
    openModal: () => setModalOpen(true),
    closeModal: () => setModalOpen(false),
    setSelectedPreset,
    updateFormField,
    resetForm,
    setActiveConnection,
    clearError,
    refreshConnections: fetchConnections,
    selectConnection,
    saveConnection: createConnection,
    refreshSchema,
    toggleTableExclusion,
    deleteConnection,
  };
}
