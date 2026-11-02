import Link from "next/link";

import { LandingLogo } from "@/components/landing/landing-logo";
import { LEGAL_BUSINESS_NAME, SITE_CONTACT_EMAIL } from "@/lib/site";

const footerLinks = [
  {
    heading: "Menu",
    links: [
      { href: "#top", label: "Home" },
      { href: "#solution", label: "Solution" },
      { href: "#faq", label: "FAQ" },
      { href: "#waitlist", label: "Waitlist" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "#about", label: "About" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    heading: "Social",
    links: [
      { href: "#", label: "Instagram" },
      { href: "#", label: "TikTok" },
      { href: `mailto:${SITE_CONTACT_EMAIL}`, label: "Email" },
    ],
  },
];

export function LandingHomeFooter() {
  return (
    <footer id="about" className="scroll-mt-24 px-4 pt-16 pb-10 md:px-8 md:pt-24 md:pb-12">
      <div className="mx-auto flex max-w-6xl flex-col">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <LandingLogo variant="light" />
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3 sm:gap-x-16">
            {footerLinks.map((group) => (
              <div key={group.heading}>
                <h2 className="text-xs font-medium tracking-[0.16em] text-zinc-400 uppercase">
                  {group.heading}
                </h2>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("/") ? (
                        <Link
                          href={link.href}
                          className="text-sm text-zinc-200 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-zinc-200 transition-colors hover:text-white"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-20 flex flex-col gap-4 sm:mt-28 sm:flex-row sm:items-center sm:justify-between">
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
      </div>
    </footer>
  );
}
