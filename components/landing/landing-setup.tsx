import Image from "next/image";
import { Check } from "lucide-react";

const setupItems = [
  "Link Instagram",
  "Add to calendar",
  "Finish setup",
  "Monthly income tracking",
];

export function LandingSetup() {
  return (
    <section
      id="features"
      className="bg-gradient-to-b from-landing-cream via-landing-rose/40 to-landing-rose px-6 py-20 lg:px-8 lg:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="font-serif text-3xl leading-snug tracking-tight text-landing-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Takes only 5 minutes to set it all up!
          </h2>

          <ul className="mt-8 space-y-5">
            {setupItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-landing-cream-text/90 text-landing-ink shadow-sm">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <span className="font-serif text-lg leading-relaxed text-landing-ink sm:text-xl">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[340px]">
          <Image
            src="/landing/setup1.png"
            alt="Instagram bio with Bridalync booking link"
            width={400}
            height={800}
            className="h-auto w-full drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
