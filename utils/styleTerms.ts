import { MAX_LOOK_VARIANT_IMAGES } from "@/schemas/lookSchema";
import type { User } from "@/schemas/userSchema";

type Role = User["role"] | null | undefined;

/** Makeup artists keep their catalog in `looks`; everyone else in `styles`. */
export function usesLooks(role: Role): boolean {
  return role === "makeupartist";
}

export type StyleTerms = {
  kind: "style" | "look";
  /** "style" / "look" */
  one: string;
  /** "styles" / "looks" */
  many: string;
  One: string;
  Many: string;
  /** CRUD base: `/api/styles` or `/api/looks`. */
  apiPath: string;
  maxImages: number;
};

export function getStyleTerms(role: Role): StyleTerms {
  return usesLooks(role)
    ? {
        kind: "look",
        one: "look",
        many: "looks",
        One: "Look",
        Many: "Looks",
        apiPath: "/api/looks",
        maxImages: MAX_LOOK_VARIANT_IMAGES,
      }
    : {
        kind: "style",
        one: "style",
        many: "styles",
        One: "Style",
        Many: "Styles",
        apiPath: "/api/styles",
        maxImages: 1,
      };
}
