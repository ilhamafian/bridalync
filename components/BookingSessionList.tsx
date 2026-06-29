"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatSessionSummary, getLocationLabel } from "@/lib/booking/utils"
import type { BookingSession } from "@/lib/schemas/booking"

type BookingSessionListProps = {
  sessions: BookingSession[]
  onRemove?: (sessionId: string) => void
  showLocation?: boolean
  emptyMessage?: string
}

export function BookingSessionList({
  sessions,
  onRemove,
  showLocation = false,
  emptyMessage = "No sessions yet — pick an event, date, and time.",
}: BookingSessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <ul className="flex w-full flex-col gap-2">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
        >
          <div className="min-w-0 text-left">
            <p className="font-medium text-foreground">
              {formatSessionSummary(session)}
            </p>
            {showLocation && session.locationId && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {getLocationLabel(session.locationId)}
              </p>
            )}
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => onRemove(session.id)}
              aria-label={`Remove ${session.eventType} session`}
            >
              <XIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
