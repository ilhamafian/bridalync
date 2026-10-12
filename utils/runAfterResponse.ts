import { after } from "next/server";

/**
 * Runs `task` once the response has been sent (emails, pushes, Google sync), so slow side effects never keep the
 * client waiting: phones drop long requests when the app goes to the background. Errors are only logged.
 * Outside a request (scripts) it just runs without being awaited.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>) {
  const run = () =>
    task().then(
      () => undefined,
      (error) => {
        console.error(`${label} failed:`, error);
      }
    );
  try {
    after(run);
  } catch {
    void run();
  }
}
