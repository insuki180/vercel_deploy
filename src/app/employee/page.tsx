import { EmployeeDashboard } from "@/components/portal/employee-dashboard";
import { PortalShell } from "@/components/portal/shell";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function EmployeePage() {
  const user = await requireRole("employee");
  const scoped = await getScopedSelectors(user);
  const employee = scoped.employee;
  const metrics = await getDashboardMetrics("employee", user);

  if (!employee) {
    return null;
  }

  return (
    <PortalShell user={user} pathname="/employee">
      <EmployeeDashboard state={scoped.state} employeeId={employee.id} metrics={metrics} />
    </PortalShell>
  );
}
