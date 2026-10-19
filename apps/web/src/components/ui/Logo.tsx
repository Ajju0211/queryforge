"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export interface LogoIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  glow?: boolean;
  priority?: boolean;
}

export function LogoIcon({
  size = 32,
  glow = false,
  priority = true,
  className,
  ...props
}: LogoIconProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 select-none transition-transform duration-200 hover:scale-105",
        glow && "drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Image
        src="/logo.png"
        alt="QueryForge AI Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  glow?: boolean;
  showText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
}

export function Logo({
  size = 32,
  glow = false,
  showText = true,
  showBadge = true,
  badgeText = "Studio",
  subtitle,
  className,
  ...props
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-1.5 justify-center", className)} {...props}>
      <LogoIcon size={size} glow={glow} />

      {showText && (
        <div className="flex flex-col w-full">
          <div className="flex items-center gap-2">
            <span className={`font-semibold font-display text-xs ${size > 24 && 'sm:text-md'} tracking-tight text-foreground`}>
              QueryForge
            </span>
            {showBadge && (
              <Badge
                variant="secondary"
                size="sm"
                className="font-medium uppercase tracking-wider text-[9px] px-1.5 py-0"
              >
                {badgeText}
              </Badge>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Logo;
