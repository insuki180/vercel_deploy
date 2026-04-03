import { AdminDashboard } from "@/components/portal/admin-dashboard";
import { PortalShell } from "@/components/portal/shell";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function AdminPage() {
  const user = await requireRole("admin");
  const scoped = await getScopedSelectors(user);
  const metrics = await getDashboardMetrics("admin", user);

  return (
    <PortalShell user={user} pathname="/admin">
      <AdminDashboard state={scoped.state} metrics={metrics} />
    </PortalShell>
  );
}
