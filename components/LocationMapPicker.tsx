"use client"

import * as React from "react"
import {
  APIProvider,
  Map,
  Marker,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps"

import type { SessionLocation } from "@/lib/schemas/booking"

const DEFAULT_CENTER = { lat: 3.139, lng: 101.6869 }
const DEFAULT_ZOOM = 11
const SELECTED_ZOOM = 17

type LocationMapPickerProps = {
  value: SessionLocation | null
  onChange: (location: SessionLocation) => void
}

type PlaceAutocompleteInputProps = {
  onPlaceSelect: (location: SessionLocation) => void
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
        fields: ["displayName", "formattedAddress", "location", "id"],
      })

      const location = place.location
      const address = place.formattedAddress

      if (!location || !address) return

      onPlaceSelect({
        label: place.displayName ?? address,
        address,
        lat: location.lat(),
        lng: location.lng(),
        placeId: place.id,
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
    value ? { lat: value.lat, lng: value.lng } : null
  )

  React.useEffect(() => {
    if (!value) return
    const nextMarker = { lat: value.lat, lng: value.lng }
    setMarker(nextMarker)
    setCenter(nextMarker)
    setZoom(SELECTED_ZOOM)
  }, [value])

  const applyLocation = React.useCallback(
    (location: SessionLocation) => {
      const nextMarker = { lat: location.lat, lng: location.lng }
      setMarker(nextMarker)
      setCenter(nextMarker)
      setZoom(SELECTED_ZOOM)
      onChange(location)
    },
    [onChange]
  )

  function handleMapClick(event: MapMouseEvent) {
    const latLng = event.detail.latLng
    if (!latLng) return

    applyLocation({
      label: value?.label ?? "Selected location",
      address: value?.address ?? "Pinned on map",
      lat: latLng.lat,
      lng: latLng.lng,
      placeId: value?.placeId,
    })
  }

  function handleMarkerDragEnd(event: google.maps.MapMouseEvent) {
    const latLng = event.latLng
    if (!latLng) return

    applyLocation({
      label: value?.label ?? "Selected location",
      address: value?.address ?? "Pinned on map",
      lat: latLng.lat(),
      lng: latLng.lng(),
      placeId: value?.placeId,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <PlaceAutocompleteInput onPlaceSelect={applyLocation} />

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
          <p className="font-medium text-foreground">{value.label}</p>
          <p className="text-xs text-muted-foreground">{value.address}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
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
