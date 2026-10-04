"use client";

import { useState } from "react";
import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
  type Icon,
} from "@tabler/icons-react";

import { VARIANT_PALETTES } from "@/components/animated-flow";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUserTheme } from "@/components/UserThemeProvider";
import { cn } from "@/lib/utils";
import {
  themePreferenceSchema,
  type ThemeColor,
  type ThemePreference,
} from "@/schemas/themeSchema";

const MODE_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: Icon;
}[] = [
  { value: "light", label: "Light", description: "Bright and airy", icon: IconSun },
  { value: "dark", label: "Dark", description: "Easier on the eyes at night", icon: IconMoon },
  {
    value: "system",
    label: "Match device",
    description: "Follow each viewer's device setting",
    icon: IconDeviceDesktop,
  },
];

/** `accent` mirrors each color's rose-800 remap in globals.css (rose itself is remapped, so it can't be used here). */
const COLOR_OPTIONS: { value: ThemeColor; label: string; accent: string }[] = [
  { value: "blush", label: "Blush", accent: "oklch(45.5% 0.188 13.697)" },
  { value: "silk", label: "Silk", accent: "oklch(45.2% 0.211 324.591)" },
  { value: "purple", label: "Purple", accent: "oklch(43.2% 0.232 292.759)" },
  { value: "blue", label: "Sky", accent: "oklch(44.3% 0.11 240.79)" },
  { value: "abyss", label: "Abyss", accent: "oklch(42.4% 0.199 265.638)" },
  { value: "aurora", label: "Aurora", accent: "oklch(43.7% 0.078 188.216)" },
  { value: "emerald", label: "Emerald", accent: "oklch(43.2% 0.095 166.913)" },
  { value: "solar", label: "Solar", accent: "oklch(47% 0.157 37.304)" },
  { value: "monochrome", label: "Mono", accent: "oklch(27.4% 0.006 286.033)" },
];

function paletteGradient(color: ThemeColor, mode: "light" | "dark") {
  const [, c1, c2, c3, c4] = VARIANT_PALETTES[color][mode];
  return `linear-gradient(135deg, ${c1}, ${c2} 35%, ${c3} 65%, ${c4})`;
}

function ColorSwatch({
  option,
  selected,
  onSelect,
}: {
  option: (typeof COLOR_OPTIONS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        glassCardClassName,
        "flex flex-col items-center gap-2 p-3 text-xs font-medium transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-primary dark:ring-primary"
      )}
    >
      <span className="relative size-12">
        <span
          className="absolute inset-0 rounded-full ring-1 ring-black/5 dark:hidden"
          style={{ background: paletteGradient(option.value, "light") }}
        />
        <span
          className="absolute inset-0 hidden rounded-full ring-1 ring-white/10 dark:block"
          style={{ background: paletteGradient(option.value, "dark") }}
        />
        <span
          className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full text-white ring-2 ring-white dark:ring-zinc-900"
          style={{ background: option.accent }}
        >
          {selected ? <IconCheck className="size-3" aria-hidden /> : null}
        </span>
      </span>
      {option.label}
    </button>
  );
}

export function ThemeSettings() {
  const { theme, setTheme, color, setColor } = useUserTheme();
  const [error, setError] = useState<string | null>(null);

  async function save(body: { theme?: ThemePreference; color?: ThemeColor }) {
    setError(null);
    const res = await fetch("/api/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    return Boolean(res?.ok);
  }

  async function handleModeChange(value: string) {
    const parsed = themePreferenceSchema.safeParse(value);
    if (!parsed.success || parsed.data === theme) return;

    const previous = theme;
    setTheme(parsed.data);
    if (!(await save({ theme: parsed.data }))) {
      setTheme(previous);
      setError("Couldn't save your theme. Please try again.");
    }
  }

  async function handleColorChange(next: ThemeColor) {
    if (next === color) return;

    const previous = color;
    setColor(next);
    if (!(await save({ color: next }))) {
      setColor(previous);
      setError("Couldn't save your theme. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Color">
        <div role="radiogroup" aria-label="Theme color" className="grid grid-cols-3 gap-3">
          {COLOR_OPTIONS.map((option) => (
            <ColorSwatch
              key={option.value}
              option={option}
              selected={option.value === color}
              onSelect={() => void handleColorChange(option.value)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <RadioGroup
          value={theme}
          onValueChange={handleModeChange}
          className={settingsListClassName}
        >
          {MODE_OPTIONS.map(({ value, label, description, icon }) => (
            <label key={value} className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={icon} />
              <RowText title={label} description={description} />
              <RadioGroupItem value={value} aria-label={label} />
            </label>
          ))}
        </RadioGroup>
      </SettingsSection>

      <p className="text-xs text-muted-foreground">
        Your clients see this theme on your booking page too.
      </p>
      <SettingsFeedback error={error} />
    </div>
  );
}
