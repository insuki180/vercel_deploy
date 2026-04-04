import { PortalShell } from "@/components/portal/shell";
import { requireRole } from "@/lib/portal/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

  return <PortalShell user={user}>{children}</PortalShell>;
}
