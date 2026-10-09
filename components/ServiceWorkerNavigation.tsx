"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Opens the page a tapped push notification points to (sent by `public/sw.js` when the app is already open). */
export function ServiceWorkerNavigation() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== "bridalync:navigate" || !data.url) return;
      if (!data.url.startsWith("/") || data.url.startsWith("//")) return;
      router.push(data.url);
      router.refresh();
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [router]);

  return null;
}
