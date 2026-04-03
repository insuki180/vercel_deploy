import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentPortalUser } from "@/lib/portal/backend";
import type { PortalRole, PortalUser } from "@/lib/portal/types";

export const SESSION_COOKIE = "portal_session";

export async function getCurrentUser() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  const supabaseUser = await getCurrentPortalUser();
  if (supabaseUser) {
    return supabaseUser;
  }

  if (!sessionId) {
    return null;
  }

  const { getPortalState } = await import("@/lib/portal/demo-store");
  const state = getPortalState();
  return state.users.find((user) => user.id === sessionId) ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(role: PortalRole) {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(
      user.role === "admin"
        ? "/admin"
        : user.role === "employer"
          ? "/employer"
          : "/employee",
    );
  }
  return user;
}

export function getRoleLabel(user: PortalUser) {
  return user.role === "admin"
    ? "Admin"
    : user.role === "employer"
      ? "Employer"
      : "Employee";
}
