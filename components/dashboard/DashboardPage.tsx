import { cn } from "@/lib/utils";

export type DashboardPageWidth = "narrow" | "wide";

/** Centers a dashboard page and caps its width on tablet/desktop. */
export function DashboardPage({
  width,
  className,
  ...props
}: React.ComponentProps<"div"> & { width: DashboardPageWidth }) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        width === "narrow" ? "max-w-2xl" : "max-w-6xl",
        className
      )}
      {...props}
    />
  );
}
