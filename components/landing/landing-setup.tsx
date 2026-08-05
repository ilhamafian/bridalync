import Image from "next/image";
import { Check } from "lucide-react";

const setupItems = [
  "Reduce chat messages up to 80%",
  "Automatically adds to calendar",
  "Emails invoice to your client",
  "Know how much you make monthly",
];

export function LandingSetup() {
  return (
    <section
      id="features"
      className="bg-[linear-gradient(to_bottom,var(--landing-cream)_0%,var(--landing-rose)_50%,var(--landing-rose)_100%)] px-6 py-20 lg:px-8 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-0">
        <div>
          <h2 className="max-w-xl font-serif text-5xl font-bold leading-[1.05] tracking-tight text-landing-cream-text sm:text-6xl lg:text-7xl">
            Takes only 5 minutes to set it all up!
          </h2>

          <ul className="mt-8 flex flex-col items-start gap-4 sm:mt-10 sm:gap-5">
            {setupItems.map((item) => (
              <li
                key={item}
                className="inline-flex w-fit items-center gap-3 rounded-2xl border-2 border-landing-cream-text/40 bg-landing-cream-text/30 px-4 py-2 shadow-sm backdrop-blur-md"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-landing-cream-text bg-landing-cream-text/30 text-landing-cream-text">
                  <Check className="size-3.5" strokeWidth={2} />
                </span>
                <span className="font-serif text-lg font-medium leading-snug text-landing-cream-text sm:text-xl">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] rotate-[-0.58deg] lg:-ml-10 lg:mx-0 lg:max-w-none xl:-ml-14">
          <Image
            src="/landing/setup1.png"
            alt="Instagram bio with Bridalync booking link"
            width={520}
            height={1040}
            className="h-auto w-full"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-landing-rose via-landing-rose/80 to-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
