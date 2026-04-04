import { notFound } from "next/navigation";
import { EmployeeSectionPage } from "@/components/portal/section-pages";
import { roleSectionGroups } from "@/components/portal/route-section";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function EmployeeSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const validSections = new Set(roleSectionGroups.employee.flatMap((group) => group.items.map((item) => item.key)));
  if (!validSections.has(section)) {
    notFound();
  }

  const user = await requireRole("employee");
  const scoped = await getScopedSelectors(user);
  const metrics = await getDashboardMetrics("employee", user);

  if (!scoped.employee) {
    notFound();
  }

  return <EmployeeSectionPage section={section} state={scoped.state} employeeId={scoped.employee.id} metrics={metrics} />;
}
