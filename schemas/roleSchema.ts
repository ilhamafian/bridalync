import { z } from "zod";

export const USER_ROLES = ["hijabstylist", "groomstylist", "hairstylist", "makeupartist", "brideassistant"] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  makeupartist: "Makeup Artist",
  groomstylist: "Groom Stylist",
  hijabstylist: "Hijab Stylist",
  hairstylist: "Hairstylist",
  brideassistant: "Bride Assistant",
};

/** Default pricing model for a new account: hijab stylists, groom stylists, and hairstylists price by style, everyone else by event. */
export function getDefaultChargeBy(role: UserRole): "package" | "style" {
  return role === "hijabstylist" || role === "groomstylist" || role === "hairstylist"
    ? "style"
    : "package";
}
