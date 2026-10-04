import { z } from "zod";

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);

export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const DEFAULT_THEME: ThemePreference = "light";
