import { PortalShell } from "@/components/portal/shell";
import { requireRole } from "@/lib/portal/session";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("employee");

  return <PortalShell user={user}>{children}</PortalShell>;
}
