import { landingGlassClassName } from "@/components/landing/glass";
import { cn } from "@/lib/utils";

const benefits = [
  {
    title: "Save time",
    description:
      "4 hours of replying messages can be spent on creating marketing videos",
  },
  {
    title: "Clear your mind",
    description: "Stop dealing with fussy clients and avoid being overwhelmed",
  },
  {
    title: "No more admin work",
    description: "Focus on making your bride happy and beautiful instead",
  },
];

export function LandingBenefits() {
  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
          What if you can...
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className={cn(landingGlassClassName, "flex flex-col gap-2 p-6")}
            >
              <h3 className="text-lg font-semibold text-zinc-50">
                {benefit.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-300">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
