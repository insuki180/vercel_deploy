import { notFound, redirect } from "next/navigation";
import { EmployerSectionPage } from "@/components/portal/section-pages";
import { roleSectionGroups } from "@/components/portal/route-section";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function EmployerSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const validSections = new Set(roleSectionGroups.employer.flatMap((group) => group.items.map((item) => item.key)));
  if (!validSections.has(section)) {
    notFound();
  }

  const user = await requireRole("employer");
  if (user.mustChangePassword && section !== "settings") {
    redirect("/employer/settings");
  }
  const scoped = await getScopedSelectors(user);
  const metrics = await getDashboardMetrics("employer", user);

  return <EmployerSectionPage section={section} state={scoped.state} user={user} metrics={metrics} />;
}
