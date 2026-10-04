"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ThemeColor, ThemePreference } from "@/schemas/themeSchema";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const COLOR_ATTRIBUTE = "data-theme-color";

type UserThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
};

const UserThemeContext = createContext<UserThemeContextValue | null>(null);

function applyMode(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

function resetTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.style.colorScheme = "";
  root.removeAttribute(COLOR_ATTRIBUTE);
}

function disableTransitions() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}")
  );
  document.head.appendChild(style);
  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => style.remove(), 1);
  };
}

/** Runs before first paint on full page loads so there's no flash of the wrong theme. */
function themeScript(theme: ThemePreference, color: ThemeColor) {
  const args = [theme, color, DARK_QUERY, COLOR_ATTRIBUTE].map((value) =>
    JSON.stringify(value)
  );
  return `(function(t,c,q,a){try{var d=t==="dark"||(t==="system"&&matchMedia(q).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.setAttribute(a,c)}catch(e){}})(${args.join(",")})`;
}

/**
 * Applies a user's theme (light/dark mode + color) to `<html>` only while
 * mounted. Pages outside this provider (landing, auth, onboarding) always
 * render the default light look.
 */
export function UserThemeProvider({
  theme: initialTheme,
  color: initialColor,
  children,
}: {
  theme: ThemePreference;
  color: ThemeColor;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [color, setColorState] = useState(initialColor);
  const [prevInitial, setPrevInitial] = useState({
    theme: initialTheme,
    color: initialColor,
  });
  if (initialTheme !== prevInitial.theme || initialColor !== prevInitial.color) {
    setPrevInitial({ theme: initialTheme, color: initialColor });
    setThemeState(initialTheme);
    setColorState(initialColor);
  }

  useEffect(() => {
    if (theme !== "system") {
      applyMode(theme === "dark");
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const sync = () => applyMode(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute(COLOR_ATTRIBUTE, color);
  }, [color]);

  useEffect(() => resetTheme, []);

  const setTheme = useCallback((next: ThemePreference) => {
    const restore = disableTransitions();
    setThemeState(next);
    requestAnimationFrame(restore);
  }, []);

  const setColor = useCallback((next: ThemeColor) => {
    const restore = disableTransitions();
    setColorState(next);
    requestAnimationFrame(restore);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, color, setColor }),
    [theme, setTheme, color, setColor]
  );

  return (
    <UserThemeContext.Provider value={value}>
      <script
        suppressHydrationWarning
        // Non-JS type on the client avoids React's script-tag warning on soft navigation.
        type={typeof window === "undefined" ? undefined : "text/plain"}
        dangerouslySetInnerHTML={{
          __html: themeScript(initialTheme, initialColor),
        }}
      />
      {children}
    </UserThemeContext.Provider>
  );
}

export function useOptionalUserTheme() {
  return useContext(UserThemeContext);
}

export function useUserTheme() {
  const context = useContext(UserThemeContext);
  if (!context) {
    throw new Error("useUserTheme must be used inside UserThemeProvider");
  }
  return context;
}
