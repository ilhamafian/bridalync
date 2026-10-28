import { landingGlassClassName } from "@/components/landing/glass";
import { LandingWaitlistForm } from "@/components/landing/landing-waitlist-form";
import { cn } from "@/lib/utils";

export function LandingWaitlist() {
  return (
    <section id="waitlist" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
      <div
        className={cn(
          landingGlassClassName,
          "mx-auto max-w-xl px-6 py-10 text-center md:px-10"
        )}
      >
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Join the waitlist
        </h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-300">
          Leave your number and we&apos;ll reach out with a personalised demo.
        </p>
        <LandingWaitlistForm />
      </div>
    </section>
  );
}
