"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ThemePreference } from "@/schemas/themeSchema";

const DARK_QUERY = "(prefers-color-scheme: dark)";

type UserThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const UserThemeContext = createContext<UserThemeContextValue | null>(null);

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

function resetTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.style.colorScheme = "";
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

/** Runs before first paint on full page loads so there's no light flash. */
function themeScript(theme: ThemePreference) {
  return `(function(t){try{var d=t==="dark"||(t==="system"&&matchMedia(${JSON.stringify(
    DARK_QUERY
  )}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})(${JSON.stringify(
    theme
  )})`;
}

/**
 * Applies a user's theme to `<html>` only while mounted. Pages outside this
 * provider (landing, auth, onboarding) always render light.
 */
export function UserThemeProvider({
  theme: initialTheme,
  children,
}: {
  theme: ThemePreference;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState(initialTheme);
  const [prevInitialTheme, setPrevInitialTheme] = useState(initialTheme);
  if (initialTheme !== prevInitialTheme) {
    setPrevInitialTheme(initialTheme);
    setThemeState(initialTheme);
  }

  useEffect(() => {
    if (theme !== "system") {
      applyTheme(theme === "dark");
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const sync = () => applyTheme(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  useEffect(() => resetTheme, []);

  const setTheme = useCallback((next: ThemePreference) => {
    const restore = disableTransitions();
    setThemeState(next);
    requestAnimationFrame(restore);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <UserThemeContext.Provider value={value}>
      <script
        suppressHydrationWarning
        // Non-JS type on the client avoids React's script-tag warning on soft navigation.
        type={typeof window === "undefined" ? undefined : "text/plain"}
        dangerouslySetInnerHTML={{ __html: themeScript(initialTheme) }}
      />
      {children}
    </UserThemeContext.Provider>
  );
}

export function useUserTheme() {
  const context = useContext(UserThemeContext);
  if (!context) {
    throw new Error("useUserTheme must be used inside UserThemeProvider");
  }
  return context;
}
