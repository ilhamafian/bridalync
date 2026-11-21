"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

const settleSpring = { type: "spring" as const, stiffness: 280, damping: 32 };

/**
 * Wizard step body. It eases in on margin, never transform or opacity, so the
 * liquid-glass cards inside keep their backdrop-filter.
 */
export function StepSettle({
  direction,
  className,
  children,
}: {
  /** 1 when moving forward, -1 when moving back. */
  direction: 1 | -1;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("flex w-full flex-1 flex-col items-center", className)}
      initial={reduceMotion ? false : { marginTop: direction * 16 }}
      animate={{ marginTop: 0 }}
      transition={settleSpring}
    >
      {children}
    </motion.div>
  );
}

/** Entrance for text and controls that do not wrap liquid glass. */
export function FadeRise({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** A review card settles into the grid. Margin only, so the glass stays sharp. */
export function ReviewSettle({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={cn("min-h-0 min-w-0", className)}
      initial={reduceMotion ? false : { marginTop: 12 }}
      animate={{ marginTop: 0 }}
      transition={{ ...settleSpring, delay: Math.min(index, 8) * 0.04 }}
    >
      {children}
    </motion.li>
  );
}
