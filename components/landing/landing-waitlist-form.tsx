"use client";

import { FormEvent, useState } from "react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";

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
        placeholder="Your phone number"
        countryCodeAriaLabel="Country code"
        mobileAriaLabel="Phone number"
      />

      <Button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-full text-sm"
      >
        {submitting ? "Joining…" : "Join Waitlist"}
      </Button>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-center text-sm text-zinc-800" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}
