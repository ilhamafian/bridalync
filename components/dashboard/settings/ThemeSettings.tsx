"use client";

import { useState } from "react";
import {
  IconDeviceDesktop,
  IconMoon,
  IconSun,
  type Icon,
} from "@tabler/icons-react";

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
  type ThemePreference,
} from "@/schemas/themeSchema";

const THEME_OPTIONS: {
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

export function ThemeSettings() {
  const { theme, setTheme } = useUserTheme();
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    const parsed = themePreferenceSchema.safeParse(value);
    if (!parsed.success || parsed.data === theme) return;

    const previous = theme;
    setTheme(parsed.data);
    setError(null);

    try {
      const res = await fetch("/api/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: parsed.data }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTheme(previous);
      setError("Couldn't save your theme. Please try again.");
    }
  }

  return (
    <SettingsSection title="Appearance">
      <RadioGroup
        value={theme}
        onValueChange={handleChange}
        className={settingsListClassName}
      >
        {THEME_OPTIONS.map(({ value, label, description, icon }) => (
          <label key={value} className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={icon} />
            <RowText title={label} description={description} />
            <RadioGroupItem value={value} aria-label={label} />
          </label>
        ))}
      </RadioGroup>
      <p className="text-xs text-muted-foreground">
        Your clients see this theme on your booking page too.
      </p>
      <SettingsFeedback error={error} />
    </SettingsSection>
  );
}
