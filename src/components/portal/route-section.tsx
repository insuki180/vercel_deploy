import type { ComponentType } from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import type { PortalRole } from "@/lib/portal/types";

type NavIcon = ComponentType<{ className?: string; size?: number }>;

export interface PortalSectionItem {
  key: string;
  label: string;
  href: string;
  icon: NavIcon;
}

export interface PortalSectionGroup {
  label: string;
  items: PortalSectionItem[];
}

export const roleSectionGroups: Record<PortalRole, PortalSectionGroup[]> = {
  admin: [
    {
      label: "Workspace",
      items: [{ key: "overview", label: "Overview", href: "/admin/overview", icon: LayoutDashboard }],
    },
    {
      label: "People",
      items: [
        { key: "companies", label: "Companies", href: "/admin/companies", icon: Building2 },
        { key: "employers", label: "Employers", href: "/admin/employers", icon: Briefcase },
        { key: "employees", label: "Employees", href: "/admin/employees", icon: Users },
        { key: "admins", label: "Admins", href: "/admin/admins", icon: UserCog },
      ],
    },
    {
      label: "Operations",
      items: [
        { key: "hiring", label: "Hiring", href: "/admin/hiring", icon: UserPlus },
        { key: "onboarding", label: "Onboarding", href: "/admin/onboarding", icon: ShieldCheck },
        { key: "leave", label: "Leave", href: "/admin/leave", icon: WalletCards },
        { key: "documents", label: "Documents", href: "/admin/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Payroll",
      items: [
        { key: "payroll", label: "Payroll", href: "/admin/payroll", icon: Banknote },
        { key: "payslips", label: "Payslips", href: "/admin/payslips", icon: FileText },
      ],
    },
    {
      label: "Lifecycle",
      items: [
        { key: "resignations", label: "Resignations", href: "/admin/resignations", icon: UserMinus },
        { key: "offboarding", label: "Offboarding", href: "/admin/offboarding", icon: FileCheck2 },
        { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  employer: [
    {
      label: "Workspace",
      items: [{ key: "overview", label: "Overview", href: "/employer/overview", icon: LayoutDashboard }],
    },
    {
      label: "Operations",
      items: [
        { key: "hiring", label: "Hiring", href: "/employer/hiring", icon: UserPlus },
        { key: "team", label: "Team", href: "/employer/team", icon: Users },
        { key: "leave", label: "Leave", href: "/employer/leave", icon: WalletCards },
      ],
    },
    {
      label: "Workflows",
      items: [
        { key: "payroll", label: "Payroll", href: "/employer/payroll", icon: Banknote },
        { key: "resignations", label: "Resignations", href: "/employer/resignations", icon: UserMinus },
        { key: "offboarding", label: "Offboarding", href: "/employer/offboarding", icon: FileCheck2 },
        { key: "settings", label: "Settings", href: "/employer/settings", icon: Settings },
      ],
    },
  ],
  employee: [
    {
      label: "Workspace",
      items: [{ key: "overview", label: "Overview", href: "/employee/overview", icon: LayoutDashboard }],
    },
    {
      label: "Profile",
      items: [
        { key: "onboarding", label: "Onboarding", href: "/employee/onboarding", icon: ShieldCheck },
        { key: "profile", label: "Profile", href: "/employee/profile", icon: Users },
        { key: "documents", label: "Documents", href: "/employee/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Operations",
      items: [
        { key: "leave", label: "Leave", href: "/employee/leave", icon: WalletCards },
        { key: "payslips", label: "Payslips", href: "/employee/payslips", icon: FileText },
        { key: "resignation", label: "Resignation", href: "/employee/resignation", icon: UserMinus },
        { key: "settings", label: "Settings", href: "/employee/settings", icon: Settings },
      ],
    },
  ],
};

export function getDefaultRoleHref(role: PortalRole) {
  return roleSectionGroups[role][0]?.items[0]?.href ?? "/";
}

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href;
}
