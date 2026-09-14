import { redirect } from "next/navigation";

import { getSessionAdmin } from "@/utils/auth/admin-session";

export async function requireAdmin() {
  const admin = await getSessionAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}
