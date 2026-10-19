"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ConnectionPresetType } from "@/domain/connection/models/connection.types";
import { Laptop, Cloud, SlidersHorizontal } from "lucide-react";

interface PresetSelectorProps {
  selectedPreset: ConnectionPresetType;
  onSelectPreset: (preset: ConnectionPresetType) => void;
}

export function PresetSelector({
  selectedPreset,
  onSelectPreset,
}: PresetSelectorProps) {
  const presets: { id: ConnectionPresetType; label: string; icon: React.ReactNode }[] = [
    { id: "local", label: "Local", icon: <Laptop className="w-3.5 h-3.5" /> },
    { id: "cloud", label: "Cloud", icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: "custom", label: "Custom", icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="grid grid-cols-3 p-1 rounded-md bg-muted/60 border border-border gap-1 select-none">
      {presets.map(({ id, label, icon }) => {
        const isSelected = selectedPreset === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectPreset(id)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1 px-2 rounded-sm text-xs font-medium transition-all duration-150 cursor-pointer",
              isSelected
                ? "bg-card text-foreground shadow-xs border border-border font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent"
            )}
          >
            <span className={cn("transition-colors shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")}>
              {icon}
            </span>
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

