"use client"

import * as React from "react"
import {
  APIProvider,
  Map,
  Marker,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps"

import type { Address } from "@/schemas/addressSchema"

const DEFAULT_CENTER = { lat: 3.139, lng: 101.6869 }
const DEFAULT_ZOOM = 11
const SELECTED_ZOOM = 17
const PINNED_PLACE_ID = "map-pinned"

type LocationMapPickerProps = {
  value: Address | null
  onChange: (address: Address) => void
}

type PlaceAutocompleteInputProps = {
  onPlaceSelect: (address: Address) => void
}

function withLocation(base: Address | null, lat: number, lng: number): Address {
  return {
    placeId: base?.placeId ?? PINNED_PLACE_ID,
    formattedAddress: base?.formattedAddress ?? "Pinned on map",
    displayName: base?.displayName ?? "Selected location",
    location: { lat, lng },
    ...(base?.addressComponents && {
      addressComponents: base.addressComponents,
    }),
  }
}

function PlaceAutocompleteInput({ onPlaceSelect }: PlaceAutocompleteInputProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const places = useMapsLibrary("places")

  React.useEffect(() => {
    if (!places || !containerRef.current) return

    const autocomplete = new places.PlaceAutocompleteElement({
      includedRegionCodes: ["my"],
    })

    autocomplete.style.width = "100%"

    const handleSelect = async (event: Event) => {
      const { placePrediction } =
        event as google.maps.places.PlacePredictionSelectEvent
      const place = placePrediction.toPlace()
      await place.fetchFields({
        fields: [
          "displayName",
          "formattedAddress",
          "location",
          "id",
          "addressComponents",
        ],
      })

      const location = place.location
      const formattedAddress = place.formattedAddress

      if (!location || !formattedAddress || !place.id) return

      const addressComponents = place.addressComponents?.flatMap((component) => {
        if (!component.longText || !component.shortText) return []
        return [
          {
            longText: component.longText,
            shortText: component.shortText,
            types: [...component.types],
          },
        ]
      })

      onPlaceSelect({
        placeId: place.id,
        formattedAddress,
        displayName: place.displayName ?? undefined,
        location: {
          lat: location.lat(),
          lng: location.lng(),
        },
        ...(addressComponents?.length && { addressComponents }),
      })
    }

    autocomplete.addEventListener("gmp-select", handleSelect)
    containerRef.current.replaceChildren(autocomplete)

    return () => {
      autocomplete.removeEventListener("gmp-select", handleSelect)
      autocomplete.remove()
    }
  }, [places, onPlaceSelect])

  return <div ref={containerRef} className="w-full" />
}

export function LocationMapPicker({ value, onChange }: LocationMapPickerProps) {
  const [center, setCenter] = React.useState(DEFAULT_CENTER)
  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM)
  const [marker, setMarker] = React.useState<google.maps.LatLngLiteral | null>(
    value ? value.location : null
  )

  React.useEffect(() => {
    if (!value) return
    setMarker(value.location)
    setCenter(value.location)
    setZoom(SELECTED_ZOOM)
  }, [value])

  const applyAddress = React.useCallback(
    (address: Address) => {
      setMarker(address.location)
      setCenter(address.location)
      setZoom(SELECTED_ZOOM)
      onChange(address)
    },
    [onChange]
  )

  function handleMapClick(event: MapMouseEvent) {
    const latLng = event.detail.latLng
    if (!latLng) return

    applyAddress(withLocation(value, latLng.lat, latLng.lng))
  }

  function handleMarkerDragEnd(event: google.maps.MapMouseEvent) {
    const latLng = event.latLng
    if (!latLng) return

    applyAddress(withLocation(value, latLng.lat(), latLng.lng()))
  }

  return (
    <div className="flex flex-col gap-3">
      <PlaceAutocompleteInput onPlaceSelect={applyAddress} />

      <div className="overflow-hidden rounded-lg border border-border">
        <Map
          center={center}
          zoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI
          className="h-56 w-full"
          onClick={handleMapClick}
        >
          {marker && (
            <Marker
              position={marker}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </Map>
      </div>

      <p className="text-xs text-muted-foreground">
        Search for a venue, then drag the pin or tap the map to refine the exact
        spot.
      </p>

      {value && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">
            {value.displayName ?? value.formattedAddress}
          </p>
          <p className="text-xs text-muted-foreground">
            {value.formattedAddress}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {value.location.lat.toFixed(6)}, {value.location.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  )
}

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <p className="text-sm text-destructive">
        Google Maps API key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to
        your environment.
      </p>
    )
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      {children}
    </APIProvider>
  )
}
