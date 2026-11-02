import Image from "next/image";

import {
  LEGAL_BUSINESS_NAME,
  LEGAL_BUSINESS_REGISTRATION,
  LEGAL_URLS,
  SITE_CONTACT_EMAIL,
} from "@/lib/site";

import { LandingLogo } from "./landing-logo";

const footerLinks = {
  Features: [
    { href: "#features", label: "Product" },
    { href: "#pricing", label: "Pricing" },
    { href: "#waitlist", label: "Waitlist" },
  ],
  Company: [
    { href: "#about", label: "About" },
    { href: LEGAL_URLS.privacy, label: "Privacy Policy" },
    { href: LEGAL_URLS.terms, label: "Terms of Service" },
  ],
  Socials: [
    { href: "#", label: "Instagram" },
    { href: "#", label: "TikTok" },
    { href: `mailto:${SITE_CONTACT_EMAIL}`, label: "Email" },
  ],
};

export function LandingFooter() {
  return (
    <footer
      id="about"
      className="bg-landing-footer px-6 py-16 text-landing-cream-text lg:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div>
            <LandingLogo variant="light" />
            <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-landing-cream-text/70">
              Bridalync helps bridal hair and makeup artists manage bookings,
              availability, clients, and payments in one place.
            </p>
            <p className="mt-3 font-serif text-sm leading-relaxed text-landing-cream-text/70">
              © {new Date().getFullYear()} {LEGAL_BUSINESS_NAME} (
              {LEGAL_BUSINESS_REGISTRATION}). All rights reserved.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3 sm:gap-x-16"
          >
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <h2 className="font-serif text-xs font-medium tracking-[0.16em] text-landing-cream-text/60 uppercase">
                  {heading}
                </h2>
                <ul className="mt-4 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="font-serif text-sm text-landing-cream-text/90 transition-colors hover:text-landing-cream-text"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-landing-cream-text/10 pt-8">
          <p className="font-serif text-sm text-landing-cream-text/50">
            <a
              href={LEGAL_URLS.privacy}
              className="transition-colors hover:text-landing-cream-text"
            >
              Privacy Policy
            </a>
            {" · "}
            <a
              href={LEGAL_URLS.terms}
              className="transition-colors hover:text-landing-cream-text"
            >
              Terms of Service
            </a>
          </p>
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-landing-cream-text">
            <Image
              src="/landing/Bridalync Icon.png"
              alt=""
              width={44}
              height={44}
              className="size-9 object-contain"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </footer>
  );
}
