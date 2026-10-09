import type { SocialLinks } from "@/schemas/userSchema";
import { toWhatsAppNumber } from "@/utils/booking/messages";

const INSTAGRAM_HOST = /^(?:www\.)?instagram\.com$/i;
const TIKTOK_HOST = /^(?:www\.)?tiktok\.com$/i;
const THREADS_HOST = /^(?:www\.)?threads\.(?:net|com)$/i;

function stripAt(value: string) {
  return value.replace(/^@+/, "").trim();
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

/** Build a clickable URL from a handle or pasted URL. */
export function resolveSocialUrl(
  platform: keyof SocialLinks,
  raw: string
): string | null {
  const value = raw.trim();
  if (!value) return null;

  const parsed = tryParseUrl(value);

  switch (platform) {
    case "instagram": {
      if (parsed && INSTAGRAM_HOST.test(parsed.hostname)) {
        return parsed.toString();
      }
      const handle = stripAt(
        parsed?.pathname.replace(/^\//, "").split("/")[0] || value
      );
      return handle ? `https://instagram.com/${handle}` : null;
    }
    case "tiktok": {
      if (parsed && TIKTOK_HOST.test(parsed.hostname)) {
        return parsed.toString();
      }
      const handle = stripAt(
        parsed?.pathname.replace(/^\//, "").split("/")[0] || value
      );
      return handle ? `https://tiktok.com/@${stripAt(handle)}` : null;
    }
    case "threads": {
      if (parsed && THREADS_HOST.test(parsed.hostname)) {
        return parsed.toString();
      }
      const handle = stripAt(
        parsed?.pathname.replace(/^\//, "").split("/")[0] || value
      );
      return handle ? `https://www.threads.com/@${handle}` : null;
    }
    default:
      return null;
  }
}

export function socialLinksWithUrls(
  links: SocialLinks | undefined | null
): Partial<Record<keyof SocialLinks, string>> {
  if (!links) return {};

  const result: Partial<Record<keyof SocialLinks, string>> = {};
  for (const key of ["instagram", "tiktok", "threads"] as const) {
    const raw = links[key];
    if (!raw) continue;
    const url = resolveSocialUrl(key, raw);
    if (url) result[key] = url;
  }
  return result;
}

export function buildWhatsAppProfileUrl(
  countryCode: string | undefined,
  mobile: string | undefined
): string | null {
  if (!countryCode?.trim() || !mobile?.trim()) return null;
  const phone = toWhatsAppNumber(countryCode, mobile);
  if (!phone) return null;
  return `https://wa.me/${phone}`;
}

export function formatWhatsAppDisplay(
  countryCode: string | undefined,
  mobile: string | undefined
): string {
  if (!countryCode?.trim() || !mobile?.trim()) return "Not set";
  return `${countryCode.trim()} ${mobile.trim()}`;
}
