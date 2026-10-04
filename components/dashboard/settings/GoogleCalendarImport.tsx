"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBrandGoogle, IconCalendarEvent } from "@tabler/icons-react";

import { EmptyCard } from "@/components/dashboard/DashboardHome";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import type {
  GoogleCalendarPreviewEvent,
  GoogleCalendarSkipCounts,
} from "@/utils/google/calendar";

type ConnectionStatus = {
  connected: boolean;
  email: string | null;
  canImport: boolean;
  canSync: boolean;
};

type PreviewResponse = {
  events?: GoogleCalendarPreviewEvent[];
  skipCounts?: GoogleCalendarSkipCounts;
  status?: ConnectionStatus;
  error?: string;
};

type ImportResponse = {
  imported?: SerializedBooking[];
  skippedExisting?: number;
  skippedConflict?: number;
  error?: string;
};

const GOOGLE_CONNECT_URL = "/api/auth/google/start?intent=calendar";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  denied: "Google Calendar access was not granted.",
  config: "Google Calendar is not configured yet.",
};

function googleErrorMessage(code: string | null) {
  if (!code) return null;
  return (
    GOOGLE_ERROR_MESSAGES[code] ??
    "Could not connect Google Calendar. Try again."
  );
}

type PreviewResult =
  | { kind: "needs-connect" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      events: GoogleCalendarPreviewEvent[];
      skipCounts?: GoogleCalendarSkipCounts;
      status?: ConnectionStatus;
    };

const PREVIEW_ERROR = "Could not load Google Calendar events.";

async function fetchPreview(): Promise<PreviewResult> {
  try {
    const response = await fetch("/api/google/calendar/preview");
    const data = (await response.json().catch(() => ({}))) as PreviewResponse;
    if (response.status === 401) return { kind: "needs-connect" };
    if (!response.ok) {
      return {
        kind: "error",
        message: typeof data.error === "string" ? data.error : PREVIEW_ERROR,
      };
    }
    return {
      kind: "ok",
      events: data.events ?? [],
      skipCounts: data.skipCounts,
      status: data.status,
    };
  } catch {
    return { kind: "error", message: PREVIEW_ERROR };
  }
}

function skipSummary(counts: GoogleCalendarSkipCounts | undefined) {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.holidays) {
    parts.push(
      `${counts.holidays} holiday calendar${counts.holidays === 1 ? "" : "s"}`
    );
  }
  if (counts.repeating) {
    parts.push(
      `${counts.repeating} repeating event${counts.repeating === 1 ? "" : "s"}`
    );
  }
  if (counts.allDay) {
    parts.push(`${counts.allDay} all-day event${counts.allDay === 1 ? "" : "s"}`);
  }
  if (!parts.length) return null;
  return `Skipped ${parts.join(", ")}.`;
}

export function GoogleCalendarImport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    googleErrorMessage(searchParams.get("google_error"))
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [events, setEvents] = useState<GoogleCalendarPreviewEvent[]>([]);
  const [skipCounts, setSkipCounts] = useState<GoogleCalendarSkipCounts>();
  const [status, setStatus] = useState<ConnectionStatus>();
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const importable = useMemo(
    () => events.filter((event) => !event.alreadyImported && !event.conflict),
    [events]
  );

  const applyPreview = useCallback((result: PreviewResult) => {
    setLoading(false);
    if (result.kind === "needs-connect") {
      setNeedsConnect(true);
      setEvents([]);
      return;
    }
    if (result.kind === "error") {
      setError(result.message);
      return;
    }

    setNeedsConnect(false);
    setEvents(result.events);
    setSkipCounts(result.skipCounts);
    setStatus(result.status);
    setSelectedIds(
      new Set(
        result.events
          .filter((event) => !event.alreadyImported && !event.conflict)
          .map((event) => event.id)
      )
    );
  }, []);

  const loadPreview = useCallback(
    async () => applyPreview(await fetchPreview()),
    [applyPreview]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("google") || params.has("google_error")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    void fetchPreview().then(applyPreview);
  }, [applyPreview]);

  function toggleId(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected =
    importable.length > 0 && importable.every((event) => selectedIds.has(event.id));
  const selectedCount = importable.filter((event) =>
    selectedIds.has(event.id)
  ).length;

  async function handleUseDifferentAccount() {
    setError(null);
    try {
      await fetch("/api/google/calendar/disconnect", { method: "POST" });
    } catch {
      // Continue to Google anyway so the account picker still opens.
    }
    window.location.href = GOOGLE_CONNECT_URL;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/google/calendar/disconnect", {
        method: "POST",
      });
      if (!response.ok) {
        setError("Could not disconnect Google Calendar.");
        return;
      }
      setNeedsConnect(true);
      setEvents([]);
      setStatus(undefined);
    } catch {
      setError("Could not disconnect Google Calendar.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleImport() {
    const eventIds = importable
      .filter((event) => selectedIds.has(event.id))
      .map((event) => event.id);
    if (eventIds.length === 0) {
      setError("Select at least one event to import.");
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/google/calendar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds }),
      });
      const data = (await response.json().catch(() => ({}))) as ImportResponse;
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not import Google Calendar events."
        );
        return;
      }

      const count = data.imported?.length ?? 0;
      setSuccess(
        count === 1 ? "1 booking imported." : `${count} bookings imported.`
      );
      setLoading(true);
      await loadPreview();
      if (count > 0) router.refresh();
    } catch {
      setError("Could not import Google Calendar events.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className={cn(settingsCardClassName, "flex-row items-center text-muted-foreground")}>
        <Spinner />
        Loading Google Calendar…
      </div>
    );
  }

  if (needsConnect) {
    return (
      <div className="flex flex-col gap-4">
        <SettingsSection title="Connect">
          <div className={cn(settingsCardClassName, "flex-row items-start")}>
            <IconBadge icon={IconBrandGoogle} />
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar to add confirmed bookings to your
              calendar automatically, and to import titled events as bookings.
              Public holidays and repeating events are skipped.
            </p>
          </div>
        </SettingsSection>
        <SettingsFeedback error={error} />
        <Button
          type="button"
          size="lg"
          className="min-h-11"
          onClick={() => {
            window.location.href = GOOGLE_CONNECT_URL;
          }}
        >
          <IconBrandGoogle data-icon="inline-start" />
          Connect Google Calendar
        </Button>
      </div>
    );
  }

  const skipped = skipSummary(skipCounts);

  return (
    <div className="flex flex-col gap-4">
      {status ? (
        <SettingsSection title="Connection">
          <div className={settingsListClassName}>
            <div className={settingsRowClassName}>
              <IconBadge icon={IconBrandGoogle} />
              <RowText
                title={status.email ?? "Google account connected"}
                description={
                  status.canSync
                    ? "Confirmed bookings are added to your primary calendar."
                    : "Booking sync is off: calendar edit access wasn't granted. Reconnect and allow it."
                }
              />
            </div>
          </div>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Events"
        action={
          importable.length > 0 ? (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() =>
                setSelectedIds(
                  allSelected
                    ? new Set()
                    : new Set(importable.map((event) => event.id))
                )
              }
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          ) : null
        }
      >
        {status && !status.canImport ? (
          <EmptyCard>
            Import is off: calendar view access wasn&apos;t granted. Reconnect
            and allow it.
          </EmptyCard>
        ) : events.length === 0 ? (
          <EmptyCard>No one-off timed events found to import.</EmptyCard>
        ) : (
          <div className={settingsListClassName}>
            {events.map((event) => {
              const disabled = event.alreadyImported || event.conflict;
              const status = event.alreadyImported
                ? " · Already imported"
                : event.conflict
                  ? " · Conflicts with a booking"
                  : "";
              return (
                <label
                  key={event.id}
                  className={cn(
                    settingsRowClassName,
                    disabled
                      ? "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent"
                      : "cursor-pointer"
                  )}
                >
                  <IconBadge icon={IconCalendarEvent} />
                  <RowText
                    title={event.title}
                    description={`${event.dateLabel} · ${event.timeLabel}${status}`}
                  />
                  <Checkbox
                    checked={selectedIds.has(event.id)}
                    disabled={disabled}
                    onCheckedChange={(value) =>
                      toggleId(event.id, value === true)
                    }
                    aria-label={`Import ${event.title}`}
                  />
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Each selected event becomes a confirmed booking. Location is left
          empty so you can add it from Bookings.
          {skipped ? ` ${skipped}` : ""}
        </p>
      </SettingsSection>

      <SettingsFeedback error={error} success={success} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        disabled={importing || selectedCount === 0}
        onClick={() => void handleImport()}
      >
        {importing
          ? "Importing…"
          : selectedCount > 0
            ? `Import ${selectedCount} ${selectedCount === 1 ? "event" : "events"}`
            : "Import events"}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="min-h-11"
        disabled={importing || disconnecting}
        onClick={() => void handleUseDifferentAccount()}
      >
        Use a different Google account
      </Button>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        className="min-h-11 text-destructive hover:text-destructive"
        disabled={importing || disconnecting}
        onClick={() => void handleDisconnect()}
      >
        {disconnecting ? "Disconnecting…" : "Disconnect Google Calendar"}
      </Button>
    </div>
  );
}
