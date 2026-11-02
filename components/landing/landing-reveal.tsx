"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Transition, type UseInViewOptions } from "motion/react";

import { cn } from "@/lib/utils";

export const revealEase = [0.16, 1, 0.3, 1] as [number, number, number, number];

export const revealViewport: UseInViewOptions = {
  once: true,
  margin: "0px 0px -12% 0px",
};

/** True once we know the visitor wants motion. Matches the server render until mount. */
export function useAnimateOnScroll() {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return !ready || reduce !== true;
}

export function revealTransition(delay = 0, duration = 0.8): Transition {
  return { duration, delay, ease: revealEase };
}

export function RevealMask({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const animate = useAnimateOnScroll();

  return (
    <motion.div
      key={animate ? "motion" : "still"}
      className={cn("-mb-[0.12em] pb-[0.12em]", animate && "overflow-hidden", className)}
      initial={animate ? "hidden" : "show"}
      whileInView="show"
      viewport={revealViewport}
    >
      <motion.div
        variants={{
          hidden: { y: "120%" },
          show: { y: "0%", transition: revealTransition(delay, 0.9) },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function RevealLine({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const animate = useAnimateOnScroll();

  return (
    <motion.span
      key={animate ? "motion" : "still"}
      className={cn("block -mb-[0.14em] pb-[0.14em]", animate && "overflow-hidden", className)}
      initial={animate ? "hidden" : "show"}
      whileInView="show"
      viewport={revealViewport}
    >
      <motion.span
        className="block"
        variants={{
          hidden: { y: "120%" },
          show: { y: "0%", transition: revealTransition(delay, 0.95) },
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

export function FadeRise({
  children,
  className,
  delay = 0,
  y = 28,
  x = 0,
  scale = 1,
  rotate = 0,
  duration = 0.75,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  scale?: number;
  rotate?: number;
  duration?: number;
}) {
  const animate = useAnimateOnScroll();

  return (
    <motion.div
      key={animate ? "motion" : "still"}
      className={className}
      initial={animate ? { opacity: 0, x, y, scale, rotate } : false}
      whileInView={animate ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 } : undefined}
      viewport={revealViewport}
      transition={revealTransition(delay, duration)}
    >
      {children}
    </motion.div>
  );
}
