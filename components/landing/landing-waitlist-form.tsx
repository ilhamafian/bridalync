"use client";

import { FormEvent, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

const fieldClassName = cn(
  "h-11 w-full rounded-xl border-0 bg-white px-3 text-sm text-zinc-900 shadow-sm",
  "placeholder:text-zinc-400",
  "outline-none focus-visible:ring-2 focus-visible:ring-white/80"
);

const selectTriggerClassName = cn(
  "h-11 w-[5.75rem] shrink-0 rounded-xl border-0 bg-white px-3 text-sm text-zinc-900 shadow-sm",
  "dark:bg-white dark:text-zinc-900 dark:hover:bg-white",
  "data-[size=default]:h-11 [&_svg]:text-zinc-500",
  "focus-visible:ring-2 focus-visible:ring-white/80"
);

export function LandingWaitlistForm() {
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      setSuccess(null);
    }
  }

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="self-end rounded-full">
          <LiquidGlass
            tint={0.2}
            className={cn(
              GLASS_SHADOW,
              "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
            )}
            contentClassName="flex items-center gap-2 px-7 py-3.5 font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
          >
            Join Waitlist
            <IconArrowRight className="size-4" aria-hidden />
          </LiquidGlass>
        </button>
      </DialogTrigger>
      <DialogContent
        className="z-[70] sm:max-w-md"
        overlayClassName="z-[70]"
      >
        <DialogHeader>
          <DialogTitle className="text-base text-foreground">
            Join the waitlist
          </DialogTitle>
          <DialogDescription className="text-sm">
            Leave your number and we&apos;ll reach out with a personalised demo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            inputClassName={fieldClassName}
            selectTriggerClassName={selectTriggerClassName}
          />

          <Button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-xl text-sm"
          >
            {submitting ? "Joining…" : "Join Waitlist"}
          </Button>

          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-foreground" role="status">
              {success}
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
