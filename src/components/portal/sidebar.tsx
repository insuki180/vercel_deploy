import type { ComponentType } from "react";
import Link from "next/link";
import { Banknote, Briefcase, Building2, FileCheck2, FileText, FolderOpen, LayoutDashboard, LogOut, ShieldCheck, UserMinus, UserPlus, Users, WalletCards } from "lucide-react";
import { logoutAction } from "@/lib/portal/actions";
import { cn } from "@/lib/utils";
import type { PortalRole, PortalUser } from "@/lib/portal/types";

const roleNav: Record<PortalRole, Array<{ href: string; label: string; icon: ComponentType<{ className?: string; size?: number }> }>> = {
  admin: [
    { href: "/admin", label: "Control Tower", icon: LayoutDashboard },
    { href: "/admin?tab=companies", label: "Companies", icon: Building2 },
    { href: "/admin?tab=employers", label: "Employers", icon: Briefcase },
    { href: "/admin?tab=employees", label: "Employees", icon: Users },
    { href: "/admin?tab=hiring", label: "Hiring Requests", icon: UserPlus },
    { href: "/admin?tab=leave", label: "Leave", icon: WalletCards },
    { href: "/admin?tab=payroll", label: "Payroll", icon: Banknote },
    { href: "/admin?tab=documents", label: "Documents", icon: FolderOpen },
    { href: "/admin?tab=offboarding", label: "Offboarding", icon: UserMinus },
  ],
  employer: [
    { href: "/employer", label: "Workspace", icon: LayoutDashboard },
    { href: "/employer?tab=hiring", label: "Hiring Requests", icon: UserPlus },
    { href: "/employer?tab=team", label: "Team", icon: Users },
    { href: "/employer?tab=leave", label: "Leave Queue", icon: WalletCards },
    { href: "/employer?tab=resignations", label: "Resignations", icon: UserMinus },
    { href: "/employer?tab=payroll", label: "Payroll", icon: Banknote },
  ],
  employee: [
    { href: "/employee", label: "Overview", icon: LayoutDashboard },
    { href: "/employee?tab=profile", label: "Profile", icon: ShieldCheck },
    { href: "/employee?tab=documents", label: "Documents", icon: FolderOpen },
    { href: "/employee?tab=leave", label: "Leave", icon: FileCheck2 },
    { href: "/employee?tab=payslips", label: "Payslips", icon: FileText },
    { href: "/employee?tab=resignation", label: "Resignation", icon: UserMinus },
  ],
};

export function Sidebar({
  user,
  pathname,
}: {
  user: PortalUser;
  pathname: string;
}) {
  const items = roleNav[user.role];

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/95 text-white md:w-80 md:border-b-0 md:border-r">
      <div className="space-y-2 p-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-sky-300">
            EOR Control
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Portal Control</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Signed in as {user.name}. Your workspace is scoped to your role and operating data.
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 pb-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href.split("?")[0];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
                isActive
                  ? "border-sky-300 bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20"
                  : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon size={18} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
            Current Session
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-sky-300">{user.role}</p>
        </div>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-slate-300 transition-colors hover:bg-white/8 hover:text-white">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
