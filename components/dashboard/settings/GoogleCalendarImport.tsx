"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBrandGoogle } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import type {
  GoogleCalendarPreviewEvent,
  GoogleCalendarSkipCounts,
} from "@/utils/google/calendar";

type PreviewResponse = {
  events?: GoogleCalendarPreviewEvent[];
  skipCounts?: GoogleCalendarSkipCounts;
  error?: string;
};

type ImportResponse = {
  imported?: SerializedBooking[];
  skippedExisting?: number;
  skippedConflict?: number;
  error?: string;
};

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

export function GoogleCalendarImport({
  onImported,
}: {
  onImported?: (bookings: SerializedBooking[]) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GoogleCalendarPreviewEvent[]>([]);
  const [skipCounts, setSkipCounts] = useState<GoogleCalendarSkipCounts>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const importable = useMemo(
    () => events.filter((event) => !event.alreadyImported && !event.conflict),
    [events]
  );

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/google/calendar/preview");
      const data = (await response.json().catch(() => ({}))) as PreviewResponse;
      if (response.status === 401) {
        setNeedsConnect(true);
        setEvents([]);
        return;
      }
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not load Google Calendar events."
        );
        return;
      }

      const nextEvents = data.events ?? [];
      setNeedsConnect(false);
      setEvents(nextEvents);
      setSkipCounts(data.skipCounts);
      setSelectedIds(
        new Set(
          nextEvents
            .filter((event) => !event.alreadyImported && !event.conflict)
            .map((event) => event.id)
        )
      );
    } catch {
      setError("Could not load Google Calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

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

  async function handleUseDifferentAccount() {
    setError(null);
    try {
      await fetch("/api/google/calendar/disconnect", { method: "POST" });
    } catch {
      // Continue to Google anyway so the account picker still opens.
    }
    window.location.href = "/api/auth/google/start?intent=calendar";
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

      onImported?.(data.imported ?? []);
      await loadPreview();
    } catch {
      setError("Could not import Google Calendar events.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading Google Calendar…
      </div>
    );
  }

  if (needsConnect) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Connect Google Calendar to import titled events as bookings. Public
          holidays and repeating events are skipped. You can add locations later
          from Bookings.
        </p>
        <Button asChild className="w-full">
          <a href="/api/auth/google/start?intent=calendar">
            <IconBrandGoogle className="size-4" />
            Connect Google Calendar
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Each selected event becomes a confirmed booking. Location is left empty
        so you can add it from Bookings.
      </p>
      {skipSummary(skipCounts) ? (
        <p className="text-xs text-muted-foreground">{skipSummary(skipCounts)}</p>
      ) : null}

      {importable.length > 0 ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(value) => {
              setSelectedIds(
                value === true
                  ? new Set(importable.map((event) => event.id))
                  : new Set()
              );
            }}
          />
          Select all importable events
        </label>
      ) : null}

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one-off timed events found to import.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {events.map((event) => {
            const disabled = event.alreadyImported || event.conflict;
            return (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-md border border-border px-3 py-2"
              >
                <Checkbox
                  checked={selectedIds.has(event.id)}
                  disabled={disabled}
                  onCheckedChange={(value) =>
                    toggleId(event.id, value === true)
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.dateLabel} · {event.timeLabel}
                  </p>
                  {event.alreadyImported ? (
                    <p className="text-xs text-muted-foreground">Already imported</p>
                  ) : null}
                  {event.conflict ? (
                    <p className="text-xs text-muted-foreground">
                      Conflicts with an existing booking
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        disabled={importing || importable.length === 0}
        onClick={() => void handleImport()}
      >
        {importing ? "Importing…" : "Import selected events"}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={importing}
        onClick={() => void handleUseDifferentAccount()}
      >
        Use a different Google account
      </Button>
    </div>
  );
}
