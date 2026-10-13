"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyLinkState = "idle" | "copied" | "error";

export function copyLinkLabel(state: CopyLinkState) {
  if (state === "copied") return "Link copied";
  if (state === "error") return "Could not copy link";
  return "Copy link";
}

/** Copies `profileUrl`; `onCopied` runs shortly after a successful copy. */
export function useCopyProfileLink(
  profileUrl: string | null,
  onCopied?: () => void
) {
  const [state, setState] = useState<CopyLinkState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setState("idle");
  }, []);

  const copy = useCallback(async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setState("copied");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (onCopied) onCopied();
        else setState("idle");
      }, 900);
    } catch {
      setState("error");
    }
  }, [onCopied, profileUrl]);

  return { state, copy, reset };
}
