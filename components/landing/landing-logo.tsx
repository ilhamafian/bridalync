import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LandingLogoProps = {
  className?: string;
  variant?: "dark" | "light";
};

export function LandingLogo({ className, variant = "dark" }: LandingLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center font-serif text-lg font-semibold tracking-[0.18em] uppercase sm:text-xl",
        variant === "light" ? "text-landing-cream-text" : "text-landing-ink",
        className
      )}
    >
      <Image
        src="/landing/Bridalync Icon.png"
        alt=""
        width={36}
        height={36}
        className="mr-2.5 size-8 rounded-lg sm:size-9"
        priority
      />
      Bridalync
    </Link>
  );
}
