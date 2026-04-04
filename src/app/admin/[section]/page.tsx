import { notFound } from "next/navigation";
import { AdminSectionPage } from "@/components/portal/section-pages";
import { roleSectionGroups } from "@/components/portal/route-section";
import { getDashboardMetrics, getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function AdminSectionRoute({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const validSections = new Set(roleSectionGroups.admin.flatMap((group) => group.items.map((item) => item.key)));
  if (!validSections.has(section)) {
    notFound();
  }

  const user = await requireRole("admin");
  const scoped = await getScopedSelectors(user);
  const metrics = await getDashboardMetrics("admin", user);

  return <AdminSectionPage section={section} state={scoped.state} user={user} metrics={metrics} />;
}
