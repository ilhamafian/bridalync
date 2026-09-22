"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 56;
const MAX_PULL = 96;
const RESISTANCE = 0.5;

type DashboardRefreshContextValue = {
  version: number;
  isRefreshing: boolean;
};

const DashboardRefreshContext =
  createContext<DashboardRefreshContextValue | null>(null);

export function useDashboardRefreshVersion() {
  return useContext(DashboardRefreshContext)?.version ?? 0;
}

export function DashboardScrollArea({ children }: { children: ReactNode }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLElement>(null);
  const [isPending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const pendingSeenRef = useRef(false);

  const refresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    startTransition(() => {
      router.refresh();
    });
  }, [refreshing, router]);

  useEffect(() => {
    if (!refreshing) return;

    if (isPending) {
      pendingSeenRef.current = true;
      return;
    }

    if (pendingSeenRef.current) {
      pendingSeenRef.current = false;
      setRefreshing(false);
      setVersion((current) => current + 1);
      return;
    }

    const timeout = window.setTimeout(() => {
      setRefreshing(false);
      setVersion((current) => current + 1);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isPending, refreshing]);

  return (
    <DashboardRefreshContext.Provider
      value={{ version, isRefreshing: refreshing }}
    >
      <main
        ref={scrollRef}
        data-dashboard-scroll=""
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-none"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
      >
        <PullToRefresh
          scrollRef={scrollRef}
          refreshing={refreshing}
          onRefresh={refresh}
        >
          {children}
        </PullToRefresh>
      </main>
    </DashboardRefreshContext.Provider>
  );
}

type PullToRefreshProps = {
  children: ReactNode;
  scrollRef: RefObject<HTMLElement | null>;
  refreshing: boolean;
  onRefresh: () => void;
};

function PullToRefresh({
  children,
  scrollRef,
  refreshing,
  onRefresh,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const pullingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const refreshingRef = useRef(refreshing);

  useEffect(() => {
    refreshingRef.current = refreshing;
    if (refreshing) {
      pullRef.current = PULL_THRESHOLD;
      setPull(PULL_THRESHOLD);
      return;
    }
    pullRef.current = 0;
    pullingRef.current = false;
    setPull(0);
  }, [refreshing]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const atTop = () => scrollEl.scrollTop <= 1;

    const shouldIgnoreTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("[data-no-pull-refresh]"));

    const reset = () => {
      trackingRef.current = false;
      pullingRef.current = false;
      pointerIdRef.current = null;
    };

    const updatePull = (next: number) => {
      pullRef.current = next;
      setPull(next);
    };

    const onFingerMove = (currentY: number, prevent: () => void) => {
      if (!trackingRef.current || refreshingRef.current) return;

      const delta = currentY - startYRef.current;

      if (!pullingRef.current) {
        if (!atTop() || delta <= 0) return;
        pullingRef.current = true;
      }

      if (delta <= 0) {
        pullingRef.current = false;
        if (pullRef.current !== 0) updatePull(0);
        return;
      }

      prevent();
      updatePull(Math.min(delta * RESISTANCE, MAX_PULL));
    };

    const onFingerEnd = () => {
      if (!trackingRef.current) return;
      const shouldRefresh =
        !refreshingRef.current && pullRef.current >= PULL_THRESHOLD;
      reset();

      if (shouldRefresh) {
        onRefresh();
        return;
      }

      updatePull(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (shouldIgnoreTarget(event.target)) {
        trackingRef.current = false;
        pullingRef.current = false;
        return;
      }
      trackingRef.current = atTop();
      pullingRef.current = false;
      startYRef.current = event.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y == null) return;
      onFingerMove(y, () => {
        if (event.cancelable) event.preventDefault();
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (refreshingRef.current) return;
      if (shouldIgnoreTarget(event.target)) {
        trackingRef.current = false;
        pullingRef.current = false;
        pointerIdRef.current = null;
        return;
      }
      trackingRef.current = atTop();
      pullingRef.current = false;
      startYRef.current = event.clientY;
      pointerIdRef.current = event.pointerId;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (pointerIdRef.current !== event.pointerId) return;
      onFingerMove(event.clientY, () => {
        if (
          pullingRef.current &&
          !scrollEl.hasPointerCapture(event.pointerId)
        ) {
          scrollEl.setPointerCapture(event.pointerId);
        }
        if (event.cancelable) event.preventDefault();
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (pointerIdRef.current !== event.pointerId) return;
      if (scrollEl.hasPointerCapture(event.pointerId)) {
        scrollEl.releasePointerCapture(event.pointerId);
      }
      onFingerEnd();
    };

    scrollEl.addEventListener("touchstart", onTouchStart, {
      passive: true,
      capture: true,
    });
    scrollEl.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    scrollEl.addEventListener("touchend", onFingerEnd, { capture: true });
    scrollEl.addEventListener("touchcancel", onFingerEnd, { capture: true });
    scrollEl.addEventListener("pointerdown", onPointerDown);
    scrollEl.addEventListener("pointermove", onPointerMove);
    scrollEl.addEventListener("pointerup", onPointerUp);
    scrollEl.addEventListener("pointercancel", onPointerUp);

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart, true);
      scrollEl.removeEventListener("touchmove", onTouchMove, true);
      scrollEl.removeEventListener("touchend", onFingerEnd, true);
      scrollEl.removeEventListener("touchcancel", onFingerEnd, true);
      scrollEl.removeEventListener("pointerdown", onPointerDown);
      scrollEl.removeEventListener("pointermove", onPointerMove);
      scrollEl.removeEventListener("pointerup", onPointerUp);
      scrollEl.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onRefresh, scrollRef]);

  const progress = Math.min(pull / PULL_THRESHOLD, 1);
  const showIndicator = pull > 2 || refreshing;

  return (
    <div className="relative">
      <div
        aria-hidden={!showIndicator}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-center"
        style={{
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className="flex size-8 items-center justify-center rounded-full bg-background/95 shadow-sm ring-1 ring-border/70"
          style={{
            transform: `scale(${refreshing ? 1 : 0.65 + progress * 0.35})`,
          }}
        >
          <Spinner
            className={cn(
              "size-4 text-foreground",
              !refreshing && "animate-none"
            )}
            style={
              !refreshing
                ? { transform: `rotate(${progress * 220}deg)` }
                : undefined
            }
          />
        </div>
      </div>

      <div
        className={cn(
          "will-change-transform",
          !refreshing &&
            pull === 0 &&
            "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translate3d(0, ${pull}px, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}
