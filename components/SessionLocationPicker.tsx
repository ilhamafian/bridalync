"use client"

import { WizardGlass, wizardCardClassName } from "@/components/booking/wizardGlass"
import { CardContent } from "@/components/ui/card"
import { useLocale } from "@/components/LocaleProvider"
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker"
import { formatLocationAddress, formatSessionSummary } from "@/utils/session"
import type { Address } from "@/schemas/addressSchema"
import type { SessionForm } from "@/schemas/sessionSchema"

type SessionLocationPickerProps = {
  sessions: SessionForm[]
  /** Stylist's saved place. Walk-in is offered only when this is set. */
  baseAddress: Address | null
  sameLocationForAll: boolean
  onSameLocationForAllChange: (value: boolean) => void
  sharedWalkIn: boolean
  onSharedWalkInChange: (value: boolean) => void
  sharedLocation: Address | null
  onSharedLocationChange: (location: Address) => void
  onSessionWalkInChange: (clientKey: string, walkIn: boolean) => void
  onSessionLocationChange: (clientKey: string, location: Address) => void
  sharedLocationHelperText?: string
  sessionLocationHelperTextByKey?: Record<string, string | undefined>
}

function WalkInChoice({
  checked,
  onChange,
  address,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  address: Address
}) {
  const { t } = useLocale()
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 rounded border-border accent-rose-800"
        />
        {t.comeToYou}
      </label>
      {checked ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-foreground">
            {formatLocationAddress(address)}
          </p>
          <p className="text-xs text-muted-foreground">{t.comeToYouHint}</p>
        </div>
      ) : null}
    </div>
  )
}

export function SessionLocationPicker({
  sessions,
  baseAddress,
  sameLocationForAll,
  onSameLocationForAllChange,
  sharedWalkIn,
  onSharedWalkInChange,
  sharedLocation,
  onSharedLocationChange,
  onSessionWalkInChange,
  onSessionLocationChange,
  sharedLocationHelperText,
  sessionLocationHelperTextByKey,
}: SessionLocationPickerProps) {
  const { t, intlLocale } = useLocale()
  const isSingleSession = sessions.length === 1
  const useSharedLocation = isSingleSession || sameLocationForAll

  return (
    <MapsProvider>
      <WizardGlass className={wizardCardClassName}>
      <CardContent className="flex flex-col gap-4">
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              {t.locationNotDecided}
            </p>
        {!isSingleSession && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sameLocationForAll}
              onChange={(event) =>
                onSameLocationForAllChange(event.target.checked)
              }
              className="size-4 rounded border-border accent-rose-800"
            />
            {t.sameLocationAll}
          </label>
        )}

        {useSharedLocation ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              {isSingleSession && sessions[0]
                ? formatSessionSummary(sessions[0], intlLocale)
                : t.locationAllSessions}
            </p>
            {baseAddress ? (
              <WalkInChoice
                checked={sharedWalkIn}
                onChange={onSharedWalkInChange}
                address={baseAddress}
              />
            ) : null}
            {sharedWalkIn ? null : (
              <LocationMapPicker
                value={sharedLocation}
                onChange={onSharedLocationChange}
                hint={t.mapHint}
                pinnedLabel={t.pinnedOnMap}
                selectedLabel={t.selectedLocation}
              />
            )}
            {!sharedWalkIn && sharedLocationHelperText && (
              <p className="text-xs text-muted-foreground">
                {sharedLocationHelperText}
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {sessions.map((session) => (
              <li
                key={session.client_key}
                className="flex flex-col gap-3 border-t border-white/40 pt-4 first:border-t-0 first:pt-0 dark:border-white/15"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatSessionSummary(session, intlLocale)}
                </p>
                {baseAddress ? (
                  <WalkInChoice
                    checked={session.walk_in === true}
                    onChange={(walkIn) =>
                      onSessionWalkInChange(session.client_key, walkIn)
                    }
                    address={baseAddress}
                  />
                ) : null}
                {session.walk_in ? null : (
                  <LocationMapPicker
                    value={session.location ?? null}
                    onChange={(location) =>
                      onSessionLocationChange(session.client_key, location)
                    }
                    hint={t.mapHint}
                    pinnedLabel={t.pinnedOnMap}
                    selectedLabel={t.selectedLocation}
                  />
                )}
                {!session.walk_in &&
                  sessionLocationHelperTextByKey?.[session.client_key] && (
                  <p className="text-xs text-muted-foreground">
                    {sessionLocationHelperTextByKey[session.client_key]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      </WizardGlass>
    </MapsProvider>
  )
}
