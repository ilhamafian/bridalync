"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

/** Same shadow the landing navbar picks up once it has scrolled. */
const SCROLLED_SHADOW =
  "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset";

/**
 * Wizard step indicator. At the top of a step it is transparent; once the
 * step scrolls it springs into a rounded liquid-glass bar with a flat edge,
 * the same motion as the landing navbar (`NavBody` / `MobileNav`). Margin is used instead of a
 * transform so the glass backdrop-filter stays visible.
 */
export function BookingStepBar({
  scrolled,
  className,
  children,
}: {
  scrolled: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("w-full max-w-lg", className)}>
      <motion.div
        data-state={scrolled ? "scrolled" : "top"}
        animate={{
          width: scrolled ? "90%" : "100%",
          marginTop: scrolled ? 12 : 0,
          paddingTop: scrolled ? 12 : 0,
          paddingBottom: scrolled ? 12 : 0,
          borderRadius: 12,
          boxShadow: scrolled ? SCROLLED_SHADOW : "none",
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 200, damping: 50 }
        }
        className="relative mx-auto"
      >
        {scrolled ? (
          <LiquidGlass
            aria-hidden
            className="pointer-events-none absolute inset-0"
            radius={12}
            tint={0}
            style={{ backgroundColor: "var(--liquid-glass-fill)" }}
          />
        ) : null}
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}
