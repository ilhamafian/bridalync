import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingFeatureRowProps = {
  title: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  size?: "default" | "sm";
};

export function LandingFeatureRow({
  title,
  imageSrc,
  imageAlt,
  reverse = false,
  size = "default",
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
          <h2
            className={cn(
              "font-serif font-bold leading-[1.1] tracking-tight text-landing-ink",
              size === "sm"
                ? "text-3xl sm:text-4xl lg:text-5xl xl:text-6xl"
                : "text-4xl sm:text-5xl lg:text-7xl"
            )}
          >
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
