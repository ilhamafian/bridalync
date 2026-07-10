"use client";

import { IconNavigation } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  buildGoogleMapsNavigateUrl,
  buildWazeDeepLink,
  buildWazeNavigateUrl,
} from "@/utils/maps";
import { cn } from "@/lib/utils";

type NavigateButtonProps = {
  lat: number;
  lng: number;
  disabled?: boolean;
  className?: string;
};

export function NavigateButton({
  lat,
  lng,
  disabled = false,
  className,
}: NavigateButtonProps) {
  function handleNavigate() {
    const wazeApp = buildWazeDeepLink(lat, lng);
    const wazeWeb = buildWazeNavigateUrl(lat, lng);
    const googleMaps = buildGoogleMapsNavigateUrl(lat, lng);

    const startedAt = Date.now();
    window.location.href = wazeApp;

    window.setTimeout(() => {
      // If the page is still here, Waze app likely didn't open — try web, then Google.
      if (Date.now() - startedAt < 1600) {
        const wazeWindow = window.open(wazeWeb, "_blank", "noopener,noreferrer");
        if (!wazeWindow) {
          window.open(googleMaps, "_blank", "noopener,noreferrer");
        }
      }
    }, 700);
  }

  return (
    <Button
      type="button"
      size="lg"
      className={cn("min-h-11 flex-1 gap-2", className)}
      disabled={disabled}
      onClick={handleNavigate}
    >
      <IconNavigation className="size-5" />
      Navigate
    </Button>
  );
}
