"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  IconDeviceDesktop,
  IconMoon,
  IconSun,
  type Icon,
} from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: {
  value: string;
  label: string;
  description: string;
  icon: Icon;
}[] = [
  { value: "light", label: "Light", description: "Bright and airy", icon: IconSun },
  { value: "dark", label: "Dark", description: "Easier on the eyes at night", icon: IconMoon },
  {
    value: "system",
    label: "Match device",
    description: "Follow your phone's setting",
    icon: IconDeviceDesktop,
  },
];

const noopSubscribe = () => () => {};

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  return (
    <SettingsSection title="Appearance">
      <RadioGroup
        value={mounted ? theme : undefined}
        onValueChange={setTheme}
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
    </SettingsSection>
  );
}
