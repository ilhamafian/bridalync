import { z } from "zod";

export const USER_ROLES = ["hijabstylist", "hairstylist", "makeupartist", "brideassistant"] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  makeupartist: "Makeup Artist",
  hijabstylist: "Hijab Stylist",
  hairstylist: "Hairstylist",
  brideassistant: "Bride Assistant",
};

/** Default pricing model for a new account: hijab stylists and hairstylists price by style, everyone else by event. */
export function getDefaultChargeBy(role: UserRole): "package" | "style" {
  return role === "hijabstylist" || role === "hairstylist" ? "style" : "package";
}
