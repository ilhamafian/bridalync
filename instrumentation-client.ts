/**
 * Filters known browser-extension noise that shows up as React hydration
 * mismatches and stray unhandled rejections (e.g. M_ID from VPN extensions).
 * Does not change hydration behavior — only silences matching console output.
 */

const HYDRATION_NOISE = [
  "react.dev/link/hydration-mismatch",
  "A tree hydrated but some attributes",
  "Hydration failed because the server rendered",
  "Text content does not match server-rendered HTML",
  "There was an error while hydrating",
  "bis_skin_checked",
];

const EXTENSION_NOISE = [
  "chrome-extension://",
  "moz-extension://",
  "reading 'M_ID'",
  'reading "M_ID"',
];

function flattenArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
      try {
        return String(arg);
      } catch {
        return "";
      }
    })
    .join(" ");
}

function matchesAny(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

function shouldSilenceConsole(...args: unknown[]): boolean {
  const message = flattenArgs(args);
  return (
    matchesAny(message, HYDRATION_NOISE) || matchesAny(message, EXTENSION_NOISE)
  );
}

function shouldSilenceRejection(reason: unknown): boolean {
  const message = flattenArgs([reason]);
  return matchesAny(message, EXTENSION_NOISE);
}

const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

console.error = (...args: unknown[]) => {
  if (shouldSilenceConsole(...args)) return;
  originalError(...args);
};

console.warn = (...args: unknown[]) => {
  if (shouldSilenceConsole(...args)) return;
  originalWarn(...args);
};

window.addEventListener("unhandledrejection", (event) => {
  if (shouldSilenceRejection(event.reason)) {
    event.preventDefault();
  }
});

window.addEventListener("error", (event) => {
  const message = flattenArgs([event.message, event.error, event.filename]);
  if (matchesAny(message, EXTENSION_NOISE)) {
    event.preventDefault();
  }
});
