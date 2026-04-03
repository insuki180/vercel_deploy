import { Sidebar } from "@/components/portal/sidebar";
import type { PortalUser } from "@/lib/portal/types";

export function PortalShell({
  user,
  pathname,
  children,
}: {
  user: PortalUser;
  pathname: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_100%)] text-slate-900 md:flex-row">
      <Sidebar user={user} pathname={pathname} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
