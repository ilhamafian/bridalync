"use client";

import { useEffect, useState } from "react";
import { IconBell, IconDeviceMobile } from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export function PwaSettingsCard() {
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [serverSubscribed, setServerSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);

    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & { MSStream?: unknown }).MSStream;

    setIsStandalone(standalone);
    setIsIos(ios);
    setIsSupported("serviceWorker" in navigator && "PushManager" in window);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    async function hydrate() {
      try {
        const statusRes = await fetch("/api/push/subscribe");
        if (statusRes.ok) {
          const status = (await statusRes.json()) as {
            subscribed?: boolean;
          };
          setServerSubscribed(Boolean(status.subscribed));
        }

        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          return;
        }

        const registration = await registerServiceWorker();
        const existing = await registration.pushManager.getSubscription();
        setSubscription(existing);
      } catch {
        // Ignore hydration errors; UI still works for install instructions.
      }
    }

    void hydrate();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    setError(null);
    setMessage(null);

    if (!deferredPrompt) return;

    setBusy(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setMessage("Bridalync was added to your device.");
      }
      setDeferredPrompt(null);
    } catch {
      setError("Could not open the install prompt. Try again from your browser menu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableNotifications() {
    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Push notifications are not configured yet.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          "Notification permission was blocked. Enable it in your browser settings."
        );
      }

      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const next =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = next.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Browser returned an incomplete push subscription.");
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          expirationTime: json.expirationTime ?? null,
          keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          typeof payload?.error === "string"
            ? payload.error
            : "Failed to save notification subscription."
        );
      }

      setSubscription(next);
      setServerSubscribed(true);
      setMessage(
        "Notifications enabled. You’ll get alerts for new and upcoming bookings."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enable notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableNotifications() {
    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      const endpoint = subscription?.endpoint;
      if (subscription) {
        await subscription.unsubscribe();
      }

      if (endpoint) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setSubscription(null);
      setServerSubscribed(false);
      setMessage("Notifications turned off on this device.");
    } catch {
      setError("Failed to turn off notifications.");
    } finally {
      setBusy(false);
    }
  }

  const notificationsOn = Boolean(subscription) || serverSubscribed;

  const installDescription = isStandalone ? (
    "You're using the installed app."
  ) : isIos ? (
    <>
      On iPhone/iPad: tap Share, then{" "}
      <span className="font-medium text-foreground">Add to Home Screen</span>.
      Open Bridalync from the home screen icon to enable notifications.
    </>
  ) : deferredPrompt ? (
    "Install Bridalync for a full-screen app experience and more reliable notifications."
  ) : (
    "Use your browser menu to install: Chrome/Edge → Install app, or the install icon in the address bar."
  );

  const notificationsDescription = !isSupported
    ? `Push notifications aren't supported in this browser.${
        isIos && !isStandalone
          ? " Install to your Home Screen first, then open the app and enable notifications."
          : ""
      }`
    : "Get notified when a client books, pays, or has a session coming up in the next 24 hours.";

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Install app">
        <div className={settingsCardClassName}>
          <div className="flex items-center gap-3">
            <IconBadge icon={IconDeviceMobile} />
            <RowText title="Bridalync app" description={installDescription} />
            <Badge variant={isStandalone ? "default" : "secondary"}>
              {isStandalone ? "Installed" : "Browser"}
            </Badge>
          </div>
          {!isStandalone && deferredPrompt ? (
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              onClick={handleInstall}
              disabled={busy}
            >
              {busy ? "Working…" : "Install Bridalync"}
            </Button>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection title="Booking notifications">
        <div className={settingsCardClassName}>
          <div className="flex items-center gap-3">
            <IconBadge icon={IconBell} />
            <RowText
              title="Push notifications"
              description={notificationsDescription}
            />
            <Badge variant={notificationsOn ? "default" : "secondary"}>
              {notificationsOn ? "On" : "Off"}
            </Badge>
          </div>
          {isSupported ? (
            <Button
              type="button"
              variant={notificationsOn ? "outline" : "default"}
              size="lg"
              className="min-h-11"
              onClick={
                notificationsOn
                  ? handleDisableNotifications
                  : handleEnableNotifications
              }
              disabled={busy}
            >
              {busy
                ? "Working…"
                : notificationsOn
                  ? "Turn off notifications"
                  : "Enable notifications"}
            </Button>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsFeedback error={error} success={message} />
    </div>
  );
}

