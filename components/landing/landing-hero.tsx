import { landingGlassClassName } from "@/components/landing/glass";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ctaClassName = "h-11 rounded-full px-6 text-sm";

export function LandingHero() {
  return (
    <section className="px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-serif text-5xl tracking-tight text-rose-900 sm:text-6xl">
            Bridalync
          </h1>
          <p className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            All in one app for glam teams
          </p>
          <p className="max-w-md text-base leading-relaxed text-zinc-700 sm:text-lg">
            Book, plan, and track all in one place
          </p>
          <Button asChild className={cn(ctaClassName, "mt-2")}>
            <a href="#waitlist">Join Waitlist</a>
          </Button>
        </div>

        <div
          aria-hidden
          className={cn(landingGlassClassName, "aspect-[4/3] w-full")}
        />
      </div>
    </section>
  );
}
