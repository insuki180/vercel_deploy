import { PortalShell } from "@/components/portal/shell";
import { requireRole } from "@/lib/portal/session";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("employer");

  return <PortalShell user={user}>{children}</PortalShell>;
}
