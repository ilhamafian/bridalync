import { AdminPaymentsManager } from "@/components/admin/AdminPaymentsManager";
import { requireAdmin } from "@/utils/auth/require-admin";

export default async function AdminPage() {
  await requireAdmin();
  return <AdminPaymentsManager />;
}
