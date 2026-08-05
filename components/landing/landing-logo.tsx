import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LandingLogoProps = {
  className?: string;
  variant?: "dark" | "light";
};

export function LandingLogo({ className, variant = "dark" }: LandingLogoProps) {
  return (
    <Link href="/" className={cn("inline-flex items-center", className)}>
      <Image
        src="/landing/Bridalync Logo.png"
        alt="Bridalync"
        width={160}
        height={48}
        className={cn(
          "h-9 w-auto sm:h-10",
          variant === "light" && "brightness-0 invert"
        )}
        priority
      />
    </Link>
  );
}
