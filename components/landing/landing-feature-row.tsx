import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingFeatureRowProps = {
  title: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
};

export function LandingFeatureRow({
  title,
  imageSrc,
  imageAlt,
  reverse = false,
}: LandingFeatureRowProps) {
  return (
    <section className="px-6 py-12 lg:px-8 lg:py-16">
      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16",
          reverse && "lg:[&>*:first-child]:order-2"
        )}
      >
        <div className="flex flex-col justify-center">
          <h2 className="font-serif text-3xl leading-snug tracking-tight text-landing-ink sm:text-4xl lg:text-[2.5rem] lg:leading-[1.2]">
            {title}
          </h2>
        </div>

        <div className="flex items-center justify-center">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={640}
            height={480}
            className="h-auto w-full max-w-lg object-contain drop-shadow-md"
          />
        </div>
      </div>
    </section>
  );
}
