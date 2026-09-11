"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type BookingLoadingStateProps = {
  message: string;
  className?: string;
};

export function BookingLoadingState({
  message,
  className,
}: BookingLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-5 py-24",
        className
      )}
    >
      <div className="relative flex size-20 items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-rose-800/15 blur-2xl animate-pulse"
        />
        <span
          aria-hidden
          className="absolute inset-1 rounded-full border border-rose-300/50"
        />
        <span
          aria-hidden
          className="absolute inset-0 animate-[spin_2.8s_linear_infinite] rounded-full border border-transparent border-t-rose-800/40"
        />
        <Spinner className="relative size-8 text-rose-800" />
      </div>

      <div className="flex flex-col items-center gap-1.5 px-6 text-center">
        <p className="text-sm font-medium tracking-wide text-zinc-800 dark:text-zinc-100">
          {message}
        </p>
        <span
          aria-hidden
          className="flex items-center gap-1.5 text-rose-800/70"
        >
          <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
          <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}
