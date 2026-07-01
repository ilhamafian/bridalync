"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type { PublicUser } from "@/schemas/userSchema";

type OnboardingStep = "role" | "travel";

type UserRole = {
  value: string;
  label: string;
};

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function getErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("role");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [travelEnabled, setTravelEnabled] = useState(false);
  const [ratePerKm, setRatePerKm] = useState("1.00");
  const [location, setLocation] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
        if (Array.isArray(data?.roles)) setRoles(data.roles);
      })
      .catch(() => setError("Could not load onboarding data."))
      .finally(() => setIsLoading(false));
  }, []);

  function handleContinueFromRole() {
    if (!selectedRole) {
      setError("Choose a role to continue.");
      return;
    }

    setError(null);
    setStep("travel");
  }

  async function handleComplete() {
    if (isSubmitting || !selectedRole) return;

    if (travelEnabled && !location) {
      setError("Pick a location on the map to enable travel.");
      return;
    }

    const parsedRate = Number.parseFloat(ratePerKm);
    if (travelEnabled && (Number.isNaN(parsedRate) || parsedRate < 0)) {
      setError("Enter a valid travel rate per km.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          travel: travelEnabled
            ? {
                enabled: true,
                rate_per_km: parsedRate,
                location,
              }
            : { enabled: false },
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(getErrorMessage(payload));
        return;
      }

      router.push(
        payload &&
          typeof payload === "object" &&
          "redirectTo" in payload &&
          typeof payload.redirectTo === "string"
          ? payload.redirectTo
          : "/"
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepNumber = step === "role" ? 1 : 2;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pb-16 pt-10 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center">
        <p className="mb-2 text-sm font-medium text-primary">Bridalync</p>
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {step === "role" ? "Choose your role" : "Travel settings"}
        </h1>
        <p className="mb-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {step === "role"
            ? "Tell clients what services you offer."
            : "Let clients know if you travel to them and where you are based."}
        </p>
        <p className="mb-8 text-center text-xs text-muted-foreground">
          Step {stepNumber} of 2
          {user?.email ? ` · Signed in as ${user.email}` : null}
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : step === "role" ? (
          <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-col gap-2">
              {roles.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role.value);
                    setError(null);
                  }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    selectedRole === role.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/50"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="h-11 w-full rounded-xl text-sm"
              disabled={!selectedRole}
              onClick={handleContinueFromRole}
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-4">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Enable travel
                </p>
                <p className="text-xs text-muted-foreground">
                  Charge clients for travel to their location.
                </p>
              </div>
              <input
                type="checkbox"
                checked={travelEnabled}
                onChange={(event) => {
                  setTravelEnabled(event.target.checked);
                  setError(null);
                }}
                className="size-4 rounded border-border accent-primary"
              />
            </label>

            {travelEnabled && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    Rate per km (RM)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={ratePerKm}
                    onChange={(event) => setRatePerKm(event.target.value)}
                    className={inputClassName}
                    required
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Your base location
                  </p>
                  <MapsProvider>
                    <LocationMapPicker value={location} onChange={setLocation} />
                  </MapsProvider>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex w-full flex-col gap-2">
              <Button
                type="button"
                size="lg"
                className="h-11 w-full rounded-xl text-sm"
                disabled={isSubmitting}
                onClick={() => void handleComplete()}
              >
                {isSubmitting ? "Saving…" : "Go to dashboard"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-11 w-full rounded-xl text-sm"
                disabled={isSubmitting}
                onClick={() => {
                  setStep("role");
                  setError(null);
                }}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
