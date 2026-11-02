"use client";

import { useEffect, useState, type ReactNode } from "react";

import Preloader from "@/components/preloader";

const INTRO_MS = 1500;

export function LandingPreloader({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeoutId = window.setTimeout(
      () => setLoading(false),
      reduced ? 200 : INTRO_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <Preloader
      loading={loading}
      variant="curtain"
      position="fixed"
      duration={INTRO_MS}
      respectReducedMotion
      ariaLabel="Loading Bridalync"
      className="min-h-dvh"
    >
      {children}
    </Preloader>
  );
}
