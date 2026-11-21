"use client";

import type { ButtonHTMLAttributes } from "react";

import { GlassCard } from "@/components/dashboard/GlassCard";
import type { LiquidGlassProps } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

/** Rounded rectangle with a flat edge, matching the dashboard glass cards. */
export const WIZARD_GLASS_RADIUS = 16;

/** Form cards on the booking wizard (calendar, contact, quotation, terms). */
export const wizardCardClassName =
  "mx-auto flex w-full min-w-72 flex-col gap-(--card-spacing) py-(--card-spacing) text-xs/relaxed text-card-foreground [--card-spacing:--spacing(6)] sm:min-w-80";

export function WizardGlass({
  radius = WIZARD_GLASS_RADIUS,
  className,
  ...props
}: LiquidGlassProps) {
  return <GlassCard radius={radius} className={cn(className)} {...props} />;
}

/** Selectable card. The chosen one stays solid rose; the others are liquid glass. */
export function WizardChoice({
  selected,
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  if (selected) {
    return (
      <button
        type={type}
        className={cn(
          className,
          "rounded-lg bg-rose-800 text-white shadow-sm hover:bg-rose-800/90 hover:text-white",
        )}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <WizardGlass
      as="button"
      type={type}
      className={cn(className, "transition hover:brightness-110")}
      {...props}
    >
      {children}
    </WizardGlass>
  );
}
