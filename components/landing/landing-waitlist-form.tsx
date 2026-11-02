"use client";

import { FormEvent, useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
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
  "h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white",
  "placeholder:text-white/40",
  "outline-none focus-visible:ring-2 focus-visible:ring-white/40"
);

const selectTriggerClassName = cn(
  "h-12 w-[6.75rem] shrink-0 rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white shadow-none",
  "hover:bg-black/50 dark:bg-black/40 dark:text-white dark:hover:bg-black/50",
  "data-[size=default]:h-12 [&_svg]:text-white/70",
  "focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/40"
);

const selectContentClassName =
  "border border-white/15 bg-[#230b17] text-white **:data-[slot=select-item]:text-white **:data-[slot=select-item]:focus:bg-white/10 **:data-[slot=select-item]:focus:text-white";

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
        className="z-[70] gap-6 bg-[#230b17] p-8 text-white ring-white/15 sm:max-w-xl [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10"
        overlayClassName="z-[70]"
      >
        <DialogHeader className="gap-2 pr-8">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-white">
            Join the waitlist
          </DialogTitle>
          <DialogDescription className="text-base text-white/70">
            Leave your number and we&apos;ll reach out with a personalised demo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            selectContentClassName={selectContentClassName}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LiquidGlass
                tint={0.22}
                className={cn(
                  GLASS_SHADOW,
                  "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100"
                )}
                contentClassName="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
              >
                {submitting ? "Joining…" : "Join Waitlist"}
                <IconArrowRight className="size-3.5" aria-hidden />
              </LiquidGlass>
            </button>
          </div>

          {error ? (
            <p className="text-sm text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-white" role="status">
              {success}
            </p>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
