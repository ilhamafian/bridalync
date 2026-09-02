"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatLocationAddress, formatSessionSummary } from "@/utils/session"
import type { SessionForm } from "@/schemas/sessionSchema"

const frostedPanelClassName =
  "rounded-lg bg-white/30 p-3 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15"

type SessionListItem = Pick<
  SessionForm,
  "name" | "date" | "time_slot" | "location" | "order"
> & {
  client_key?: string
}

type BookingSessionListProps = {
  sessions: SessionListItem[]
  onRemove?: (clientKey: string) => void
  showLocation?: boolean
  emptyMessage?: string
  frosted?: boolean
}

export function BookingSessionList({
  sessions,
  onRemove,
  showLocation = false,
  emptyMessage = "No sessions yet — pick an event, date, and time.",
  frosted = false,
}: BookingSessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className={cn(frosted && frostedPanelClassName)}>
        <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ul
      className={cn(
        "flex w-full flex-col gap-2",
        frosted && frostedPanelClassName
      )}
    >
      {sessions.map((session) => {
        const clientKey = session.client_key
        return (
        <li
          key={
            session.client_key ??
            `${session.order}-${session.name}-${new Date(session.date).toISOString()}-${session.time_slot.startTime}-${session.time_slot.endTime}`
          }
          className={cn(
            "flex items-start justify-between gap-3 text-sm",
            frosted
              ? "rounded-md px-1 py-2.5"
              : "rounded-lg border border-border bg-card px-3 py-2.5"
          )}
        >
          <div className="min-w-0 text-left">
            <p className="font-medium text-foreground">
              {formatSessionSummary(session)}
            </p>
            {showLocation && session.location && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLocationAddress(session.location)}
              </p>
            )}
          </div>
          {onRemove && clientKey && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => onRemove(clientKey)}
              aria-label={`Remove ${session.name} session`}
            >
              <XIcon />
            </Button>
          )}
        </li>
        )
      })}
    </ul>
  )
}
