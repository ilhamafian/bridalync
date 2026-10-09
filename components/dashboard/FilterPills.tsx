import { cn } from "@/lib/utils";

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar lg:-mx-6 lg:px-6",
        className
      )}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-white/30 text-foreground shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
