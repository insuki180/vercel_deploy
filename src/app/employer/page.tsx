import { EmployerDashboard } from "@/components/portal/employer-dashboard";
import { PortalShell } from "@/components/portal/shell";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function EmployerPage() {
  const user = await requireRole("employer");
  const scoped = await getScopedSelectors(user);
  const metrics = await getDashboardMetrics("employer", user);

  return (
    <PortalShell user={user} pathname="/employer">
      <EmployerDashboard state={scoped.state} user={user} metrics={metrics} />
    </PortalShell>
  );
}
