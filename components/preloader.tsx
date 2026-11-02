"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface PreloaderProps {
  /** Whether the preloader is active */
  loading: boolean;

  /** Visual variant of the preloader */
  variant?: "stairs" | "percentage" | "circle" | "slide" | "curtain";

  /** Position type of the preloader container */
  position?: "fixed" | "absolute";

  /** Duration of the loading animation in milliseconds */
  duration?: number;

  /** Loading text to display under the logo */
  loadingText?: string;

  /** Callback when loading completes */
  onComplete?: () => void;

  /** Callback when loading starts */
  onLoadingStart?: () => void;

  /** Callback when exit animation completes */
  onLoadingComplete?: () => void;

  /** Additional CSS classes */
  className?: string;

  /** Z-index for the preloader */
  zIndex?: number;

  /** Background color (overrides the brand burgundy) */
  bgColor?: string;

  /** CSS classes for the loading text */
  textClassName?: string;

  /** Content to show after loading */
  children?: React.ReactNode;

  /** Respect prefers-reduced-motion setting */
  respectReducedMotion?: boolean;

  /** Fallback behavior when reduced motion is preferred */
  reducedMotionFallback?: "fade" | "none";

  /** ARIA label for screen readers */
  ariaLabel?: string;

  /** ARIA live region politeness */
  ariaLive?: "polite" | "assertive" | "off";

  /** Progress threshold (0-100) when text starts fading */
  textFadeThreshold?: number;

  /** Backdrop blur amount in pixels */
  backdropBlur?: number;

  /** Custom content to replace default loader (render prop) */
  customContent?: (progress: number) => React.ReactNode;

  /** Position of percentage counter */
  percentagePosition?: "center" | "bottom-left" | "top-left";

  /** Show percentage sign */
  showPercentageSign?: boolean;

  /** CSS classes for percentage text */
  percentageTextClassName?: string;

  /** Show progress bar */
  showProgressBar?: boolean;

  /** Progress bar position */
  progressBarPosition?: "top" | "bottom";

  /** Number of stairs */
  stairCount?: number;

  /** Direction stairs reveal from */
  stairsRevealFrom?: "left" | "right" | "center";

  /** Direction stairs move when revealing */
  stairsRevealDirection?: "up" | "down";
}

/** Landing and auth burgundy. */
const BRAND_BG = "#230b17";
const EASE = [0.65, 0, 0.35, 1] as const;

const SCROLL_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

function panelBackground(bgColor?: string) {
  return bgColor ?? BRAND_BG;
}

const Preloader: React.FC<PreloaderProps> = ({
  loading,
  variant = "curtain",
  position = "fixed",
  duration = 1600,
  loadingText = "",
  onComplete,
  onLoadingStart,
  onLoadingComplete,
  className = "",
  zIndex = 80,
  bgColor,
  textClassName = "",
  children,
  respectReducedMotion = false,
  reducedMotionFallback = "fade",
  ariaLabel = "Loading Bridalync",
  ariaLive = "polite",
  textFadeThreshold = 99,
  backdropBlur = 0,
  customContent,
  percentagePosition = "center",
  showPercentageSign = true,
  percentageTextClassName = "",
  showProgressBar = true,
  progressBarPosition = "bottom",
  stairCount = 6,
  stairsRevealFrom = "center",
  stairsRevealDirection = "up",
}) => {
  const [progress, setProgress] = useState(loading ? 0 : 100);
  const [showPreloader, setShowPreloader] = useState(loading);
  const [exiting, setExiting] = useState(false);
  const [hideText, setHideText] = useState(!loading);
  const rafRef = useRef<number | null>(null);
  const textHiddenRef = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!respectReducedMotion) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches);
    };

    handleChange(mediaQuery);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [respectReducedMotion]);

  useEffect(() => {
    if (!showPreloader || position !== "fixed") return;

    const blockScroll = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const blockKeys = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) {
        event.preventDefault();
      }
    };
    const options = { capture: true, passive: false } as AddEventListenerOptions;
    window.addEventListener("wheel", blockScroll, options);
    window.addEventListener("touchmove", blockScroll, options);
    window.addEventListener("keydown", blockKeys, true);

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    return () => {
      window.removeEventListener("wheel", blockScroll, options);
      window.removeEventListener("touchmove", blockScroll, options);
      window.removeEventListener("keydown", blockKeys, true);
      html.style.overflow = previousOverflow;
    };
  }, [showPreloader, position]);

  useEffect(() => {
    let fadeTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let exitTimeoutId: ReturnType<typeof setTimeout> | undefined;

    if (loading) {
      const startTime = Date.now();
      let isActive = true;
      textHiddenRef.current = false;

      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        onLoadingStart?.();
      }

      const updateProgress = () => {
        if (!isActive) return;

        const elapsed = Date.now() - startTime;
        let newProgress = (elapsed / duration) * 100;

        if (newProgress > 90) {
          const excess = newProgress - 90;
          newProgress = 90 + excess * 0.1;
        }

        newProgress = Math.min(newProgress, 99);
        setProgress(newProgress);

        if (newProgress >= textFadeThreshold && !textHiddenRef.current) {
          textHiddenRef.current = true;
          setHideText(true);
        }

        rafRef.current = requestAnimationFrame(updateProgress);
      };

      requestAnimationFrame(() => {
        if (!isActive) return;
        setExiting(false);
        setShowPreloader(true);
        setHideText(false);
        setProgress(0);
        updateProgress();
      });

      return () => {
        isActive = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    } else if (showPreloader) {
      hasStartedRef.current = false;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      rafRef.current = requestAnimationFrame(() => {
        setProgress(100);
        if (!textHiddenRef.current) {
          textHiddenRef.current = true;
          setHideText(true);
        }
      });

      const reduced =
        prefersReducedMotion && reducedMotionFallback !== "none";
      const holdDelay = variant === "percentage" && !reduced ? 500 : 0;
      const exitDuration = reduced
        ? 300
        : variant === "stairs"
          ? 1100
          : variant === "percentage"
            ? 450
            : 900;

      fadeTimeoutId = setTimeout(() => {
        setExiting(true);
        exitTimeoutId = setTimeout(() => {
          onComplete?.();
          onLoadingComplete?.();
          setShowPreloader(false);
          setExiting(false);
        }, exitDuration);
      }, holdDelay);

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        clearTimeout(fadeTimeoutId);
        clearTimeout(exitTimeoutId);
      };
    }
  }, [
    loading,
    duration,
    onComplete,
    onLoadingStart,
    onLoadingComplete,
    variant,
    textFadeThreshold,
    showPreloader,
    prefersReducedMotion,
    reducedMotionFallback,
  ]);

  const reducedFade =
    prefersReducedMotion && reducedMotionFallback === "fade";
  const skipMotion =
    prefersReducedMotion && reducedMotionFallback === "none";
  const fill = panelBackground(bgColor);

  const renderBrandMark = (compact = false) => {
    const words = loadingText.split(" ").filter(Boolean);

    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={
            exiting
              ? { opacity: 0, filter: "blur(8px)" }
              : { opacity: 1, filter: "blur(0px)" }
          }
          transition={{
            duration: exiting ? 0.25 : 0.45,
            ease: EASE,
          }}
          className="relative flex flex-col items-center"
        >
          <Image
            src="/landing/Bridalync Logo.png"
            alt=""
            width={220}
            height={64}
            priority
            className={cn(
              "relative h-11 w-auto brightness-0 invert sm:h-12",
              compact && "h-8 sm:h-9"
            )}
          />
          {words.length > 0 && (
            <div className="relative mt-5 flex flex-wrap justify-center gap-x-2 px-8">
              {words.map((word, index) => (
                <motion.span
                  key={`${word}-${index}`}
                  initial={false}
                  animate={
                    hideText
                      ? { opacity: 0, filter: "blur(8px)" }
                      : { opacity: 1, filter: "blur(0px)" }
                  }
                  transition={{
                    duration: hideText ? 0.3 : 0.5,
                    delay: hideText ? 0 : index * 0.08,
                    ease: EASE,
                  }}
                  className={cn(
                    "font-serif text-2xl font-medium tracking-tight text-rose-100 italic sm:text-3xl",
                    textClassName
                  )}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          )}
          <div
            aria-hidden
            className="relative mt-7 h-px w-16 overflow-hidden bg-white/25"
          >
            <div
              className="h-full bg-rose-200"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </motion.div>
      </div>
    );
  };

  const renderStairsVariant = () => {
    const stairs = Array.from({ length: stairCount });

    const getStairDelay = (index: number) => {
      if (stairsRevealFrom === "left") {
        return index * 0.07;
      }
      if (stairsRevealFrom === "right") {
        return (stairCount - 1 - index) * 0.07;
      }
      const middle = (stairCount - 1) / 2;
      return Math.abs(index - middle) * 0.07;
    };

    const exitY = stairsRevealDirection === "up" ? "-100%" : "100%";

    return (
      <div className="absolute inset-0 flex overflow-hidden">
        {stairs.map((_, index) => (
          <motion.div
            key={`stair-${index}`}
            initial={false}
            animate={
              !exiting
                ? { y: "0%", opacity: 1 }
                : reducedFade || skipMotion
                  ? { opacity: 0 }
                  : { y: exitY }
            }
            transition={{
              duration: reducedFade || skipMotion ? 0.3 : 0.55,
              delay:
                exiting && !reducedFade && !skipMotion
                  ? getStairDelay(index)
                  : 0,
              ease: EASE,
            }}
            className="h-full flex-1"
            style={{ backgroundColor: fill }}
          />
        ))}
        {renderBrandMark()}
      </div>
    );
  };

  const renderPercentageVariant = () => {
    const displayProgress = Math.floor(progress);

    const getPositionClasses = () => {
      if (percentagePosition === "bottom-left") {
        return "justify-end items-start p-8";
      }
      if (percentagePosition === "top-left") {
        return "justify-start items-start p-8";
      }
      return "items-center justify-center";
    };

    return (
      <motion.div
        initial={false}
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: reducedFade || skipMotion ? 0.2 : 0.4, ease: EASE }}
        className={cn("absolute inset-0 flex flex-col", getPositionClasses())}
        style={{
          backgroundColor: fill,
          backdropFilter:
            backdropBlur > 0 ? `blur(${backdropBlur}px)` : undefined,
        }}
        role="progressbar"
        aria-label={ariaLabel}
        aria-live={ariaLive}
        aria-valuenow={displayProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="mb-6">
          <Image
            src="/landing/Bridalync Logo.png"
            alt=""
            width={180}
            height={52}
            priority
            className="h-8 w-auto brightness-0 invert sm:h-9"
          />
        </div>
        <div
          className={cn(
            "font-serif text-[min(22vw,9rem)] leading-none font-medium tracking-tight text-rose-50 tabular-nums",
            percentageTextClassName
          )}
        >
          {displayProgress}
          {showPercentageSign && (
            <span className="text-[min(10vw,4.5rem)] text-rose-200/70">%</span>
          )}
        </div>
        {showProgressBar && (
          <div
            className={cn(
              "absolute right-0 left-0 h-px bg-white/20",
              progressBarPosition === "top" ? "top-0" : "bottom-0"
            )}
          >
            <div
              className="h-full bg-rose-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </motion.div>
    );
  };

  const renderCircleVariant = () => (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <motion.div
        initial={false}
        animate={
          !exiting
            ? { scale: 1, opacity: 1 }
            : reducedFade || skipMotion
              ? { opacity: 0 }
              : { scale: 0 }
        }
        transition={{
          duration: reducedFade || skipMotion ? 0.3 : 0.7,
          ease: EASE,
        }}
        className="aspect-square rounded-full"
        style={{
          width: "300vmax",
          height: "300vmax",
          backgroundColor: fill,
        }}
      />
      {renderBrandMark()}
    </div>
  );

  const renderSlideVariant = () => (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        initial={false}
        animate={
          !exiting
            ? { x: "0%", opacity: 1 }
            : reducedFade || skipMotion
              ? { opacity: 0 }
              : { x: "100%" }
        }
        transition={{
          duration: reducedFade || skipMotion ? 0.3 : 0.8,
          ease: EASE,
        }}
        className="h-full w-full"
        style={{ backgroundColor: fill }}
      />
      {renderBrandMark()}
    </div>
  );

  const renderCurtainVariant = () => (
    <div className="absolute inset-0 flex overflow-hidden">
      {(["-100%", "100%"] as const).map((exitX) => (
        <motion.div
          key={exitX}
          initial={false}
          animate={
            !exiting
              ? { x: "0%", opacity: 1 }
              : reducedFade || skipMotion
                ? { opacity: 0 }
                : { x: exitX }
          }
          transition={{
            duration: reducedFade || skipMotion ? 0.3 : 0.85,
            ease: EASE,
          }}
          className="h-full w-1/2"
          style={{ backgroundColor: fill }}
        />
      ))}
      {renderBrandMark()}
    </div>
  );

  return (
    <div className={cn("relative h-full w-full", className)}>
      <AnimatePresence>
        {showPreloader && (
          <div
            key="preloader"
            className={cn(
              "inset-0 overflow-hidden",
              position === "fixed" ? "fixed" : "absolute",
              exiting && "pointer-events-none"
            )}
            style={{ zIndex }}
            role="status"
            aria-label={ariaLabel}
            aria-live={ariaLive}
            aria-busy="true"
          >
            {customContent ? (
              <div className="absolute inset-0">{customContent(progress)}</div>
            ) : (
              <>
                {variant === "stairs" && renderStairsVariant()}
                {variant === "percentage" && renderPercentageVariant()}
                {variant === "circle" && renderCircleVariant()}
                {variant === "slide" && renderSlideVariant()}
                {variant === "curtain" && renderCurtainVariant()}
              </>
            )}
          </div>
        )}
      </AnimatePresence>
      <div
        className={cn(
          "h-full min-h-0 w-full",
          showPreloader && !exiting && "pointer-events-none invisible"
        )}
      >
        {children}
      </div>
    </div>
  );
};

Preloader.displayName = "Preloader";

export default Preloader;
