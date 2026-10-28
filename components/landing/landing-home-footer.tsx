import Link from "next/link";

import { LandingLogo } from "@/components/landing/landing-logo";
import { LEGAL_BUSINESS_NAME } from "@/lib/site";

export function LandingHomeFooter() {
  return (
    <footer id="about" className="scroll-mt-24 px-4 py-10 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <LandingLogo variant="light" />
        <p className="text-sm text-zinc-300">
          © {new Date().getFullYear()} {LEGAL_BUSINESS_NAME}. All rights
          reserved.
        </p>
        <nav className="flex items-center gap-4 text-sm" aria-label="Legal">
          <Link
            href="/privacy"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Terms of Service
          </Link>
        </nav>
      </div>
    </footer>
  );
}
