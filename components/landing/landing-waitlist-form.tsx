"use client";

import { FormEvent, useState } from "react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const phoneInputClassName = cn(
  "h-12 w-full rounded-full border border-landing-cream-text/40 bg-landing-cream-text/20 px-4 text-base text-landing-cream-text",
  "placeholder:text-landing-cream-text/50",
  "outline-none focus-visible:border-landing-cream-text/70 focus-visible:ring-2 focus-visible:ring-landing-cream-text/25"
);

const selectTriggerClassName = cn(
  "h-12 w-30 rounded-full border border-landing-cream-text/40 bg-landing-cream-text/20 text-landing-cream-text",
  "data-[size=default]:h-12",
  "hover:bg-landing-cream-text/30 focus-visible:border-landing-cream-text/70 focus-visible:ring-landing-cream-text/25",
  "[&_svg]:text-landing-cream-text/80"
);

export function LandingWaitlistForm() {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = mobile.trim();
    if (!isValidPhoneNumber(trimmed)) {
      setError("Enter a valid phone number so we can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: countryCode,
          mobile: trimmed,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: unknown;
      } | null;

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Something went wrong. Please try again."
        );
        return;
      }

      setSuccess(
        data?.message ?? "You're on the waitlist. We'll be in touch soon."
      );
      setMobile("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 text-left"
    >
      <label className="sr-only" htmlFor="waitlist-phone">
        Phone number
      </label>
      <PhoneNumberInput
        countryCode={countryCode}
        mobile={mobile}
        onCountryCodeChange={setCountryCode}
        onMobileChange={setMobile}
        mobileInputId="waitlist-phone"
        inputClassName={phoneInputClassName}
        selectTriggerClassName={selectTriggerClassName}
        placeholder="Your phone number"
        countryCodeAriaLabel="Country code"
        mobileAriaLabel="Phone number"
      />

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="h-12 rounded-full border-2 border-landing-cream-text/40 bg-landing-cream-text/30 px-8 font-serif text-base font-medium text-landing-cream-text shadow-sm backdrop-blur-md hover:bg-landing-cream-text/40 disabled:opacity-70"
      >
        {submitting ? "Joining…" : "Join Waitlist"}
      </Button>

      {error ? (
        <p className="text-center font-serif text-sm text-landing-cream-text/95" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-center font-serif text-sm text-landing-cream-text" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}
