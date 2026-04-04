"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/portal/actions";
import { getDefaultRoleHref, isNavItemActive, roleSectionGroups } from "@/components/portal/route-section";
import { cn } from "@/lib/utils";
import type { PortalUser } from "@/lib/portal/types";

export function Sidebar({
  user,
}: {
  user: PortalUser;
}) {
  const pathname = usePathname();
  const groups = roleSectionGroups[user.role];
  const homeHref = getDefaultRoleHref(user.role);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/95 text-white md:w-80 md:border-b-0 md:border-r">
      <div className="space-y-2 p-6">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-sky-300">
            EOR Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Operations Workspace</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Signed in as {user.name}. Navigate your role-specific sections from here.
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
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
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
            Current Session
          </p>
          <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-sky-300">{user.role}</p>
        </div>
        <Link
          href={homeHref}
          className="mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
        >
          <span className="font-medium">Back to overview</span>
        </Link>
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
