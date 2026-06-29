"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LOCATION_OPTIONS } from "@/lib/booking/constants"
import { formatSessionSummary } from "@/lib/booking/utils"
import type { BookingSession } from "@/lib/schemas/booking"

type SessionLocationPickerProps = {
  sessions: BookingSession[]
  sameLocationForAll: boolean
  onSameLocationForAllChange: (value: boolean) => void
  sharedLocationId: string | null
  onSharedLocationChange: (locationId: string) => void
  onSessionLocationChange: (sessionId: string, locationId: string) => void
}

function LocationOptions({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (locationId: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {LOCATION_OPTIONS.map((location) => (
        <Button
          key={location.id}
          type="button"
          variant={value === location.id ? "default" : "outline"}
          size="default"
          disabled={disabled}
          className="h-8 w-full"
          onClick={() => onChange(location.id)}
        >
          {location.label}
        </Button>
      ))}
    </div>
  )
}

export function SessionLocationPicker({
  sessions,
  sameLocationForAll,
  onSameLocationForAllChange,
  sharedLocationId,
  onSharedLocationChange,
  onSessionLocationChange,
}: SessionLocationPickerProps) {
  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={sameLocationForAll}
            onChange={(event) =>
              onSameLocationForAllChange(event.target.checked)
            }
            className="size-4 rounded border-border accent-primary"
          />
          Same location for all sessions
        </label>

        {sameLocationForAll ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Location for all sessions
            </p>
            <LocationOptions
              value={sharedLocationId}
              onChange={onSharedLocationChange}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatSessionSummary(session)}
                </p>
                <LocationOptions
                  value={session.locationId}
                  onChange={(locationId) =>
                    onSessionLocationChange(session.id, locationId)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
