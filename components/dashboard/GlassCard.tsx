"use client";

import type { ComponentProps } from "react";

import { RadioGroup } from "@/components/ui/radio-group";
import { LiquidGlass, type LiquidGlassProps } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

const GLASS_FILL = "var(--liquid-glass-fill)";

/**
 * Dashboard card surface. Rounded-2xl in this theme is 1.125rem (18px).
 * Calmer refraction than the pill buttons so type on the card stays easy to read.
 */
export function GlassCard({
  className,
  radius = 18,
  bevelDepth = 16,
  scale = 36,
  aberration = 2,
  frost = 0.35,
  tint = 0.16,
  style,
  ...props
}: LiquidGlassProps) {
  return (
    <LiquidGlass
      radius={radius}
      bevelDepth={bevelDepth}
      scale={scale}
      aberration={aberration}
      frost={frost}
      tint={tint}
      className={cn("shadow-sm ring-1 ring-white/60 dark:ring-white/15", className)}
      style={{ backgroundColor: GLASS_FILL, ...style }}
      {...props}
    />
  );
}

/** Settings form card: padded column. Extra classes merge through tailwind-merge. */
export function SettingsCard({ className, ...props }: LiquidGlassProps) {
  return (
    <GlassCard
      className={cn("flex flex-col gap-4 p-4 text-sm", className)}
      {...props}
    />
  );
}

/** Settings list card: divided rows. */
export function SettingsList({ className, ...props }: LiquidGlassProps) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col gap-0 divide-y divide-white/50 dark:divide-white/10",
        className,
      )}
      {...props}
    />
  );
}

const radioListClassName =
  "flex w-full flex-col gap-0 divide-y divide-white/50 dark:divide-white/10";

/** Radio list on a liquid-glass card. Radix needs its own root, so the glass wraps it. */
export function GlassRadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroup>) {
  return (
    <GlassCard>
      <RadioGroup className={cn(radioListClassName, className)} {...props} />
    </GlassCard>
  );
}
