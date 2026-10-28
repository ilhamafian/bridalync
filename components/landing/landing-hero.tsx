import Image from "next/image";

import { SatinRidges } from "@/components/satin-ridges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ctaClassName = "h-11 rounded-full px-6 text-sm";

export function LandingHero() {
  return (
    <section>
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
        <div className="grid md:min-h-[32rem] md:grid-cols-2 md:grid-rows-[1fr]">
          <div className="flex flex-col items-start justify-center gap-4 px-4 py-12 md:py-20 md:pr-12 md:pl-[max(2rem,calc((200%-72rem)/2+2rem))]">
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

          <div className="relative aspect-[666/455] w-full md:aspect-auto md:h-full md:min-h-full">
            <Image
              src="/landing/hero_brush.webp"
              alt="Makeup brushes with a cloud of pink powder"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </SatinRidges>
    </section>
  );
}
