import { z } from "zod";

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);

export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const DEFAULT_THEME: ThemePreference = "light";

/** Matches `AnimatedFlow` variants; each also remaps the rose accent in globals.css. */
export const themeColorSchema = z.enum([
  "blush",
  "silk",
  "purple",
  "blue",
  "abyss",
  "aurora",
  "emerald",
  "solar",
  "monochrome",
]);

export type ThemeColor = z.infer<typeof themeColorSchema>;

export const DEFAULT_THEME_COLOR: ThemeColor = "blush";
