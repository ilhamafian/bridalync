import { IconArrowRight } from "@tabler/icons-react";

import { LandingDashboardPreview } from "@/components/landing/landing-dashboard-preview";
import { SatinRidges } from "@/components/satin-ridges";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

export function LandingHero() {
  return (
    <section className="-mt-16">
      <SatinRidges
        colors={["#961b45", "#ff6653"]}
        backgroundColor="#230b17"
        angle={-33}
        scale={1.35}
        depth={1.00}
        warp={1.00}
        gloss={0.4}
        highlight={0.85}
        lightAngle={-70}
        sheen={0.65}
        speed={1}
        seed={12}
        clickRipples={false}
        className="w-full"
      >
        <div className="grid min-h-dvh grid-rows-[auto_minmax(18rem,1fr)] pt-16 md:grid-cols-2 md:grid-rows-[1fr]">
          <div className="flex flex-col items-start justify-center gap-4 px-4 py-12 md:py-20 md:pr-12 md:pl-[max(2rem,calc((200%-72rem)/2+2rem))]">
            <h1 className="font-serif text-5xl tracking-tight text-rose-200 sm:text-6xl">
              Bridalync
            </h1>
            <p className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              All in one app for glam teams
            </p>
            <p className="max-w-md text-base leading-relaxed text-zinc-300 sm:text-lg">
              Book, plan, and track all in one place
            </p>
            <a href="#waitlist" className="mt-2 inline-flex rounded-full">
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
            </a>
          </div>

          <div className="flex w-full items-center justify-center px-4 py-6 md:h-full md:min-h-0 md:overflow-hidden md:px-8 md:py-6 md:pr-[max(2rem,calc((200%-72rem)/2+2rem))]">
            <LandingDashboardPreview className="h-[34rem] md:h-[min(42rem,calc(100svh-6.75rem))]" />
          </div>
        </div>
      </SatinRidges>
    </section>
  );
}
