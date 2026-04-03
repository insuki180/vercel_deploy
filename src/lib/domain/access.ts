import type { AppRole, CompanyStatus } from "@/lib/domain/types";

export function getRoleHomePath(role: AppRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "employer") {
    return "/employer";
  }

  return "/employee";
}

export function canAccessCompanyRecords(input: {
  role: AppRole;
  companyStatus: CompanyStatus;
}) {
  return input.role === "admin" || input.companyStatus === "active" || input.role === "employer";
}

export function canRunOperationalActionsForCompany(input: {
  role: AppRole;
  companyStatus: CompanyStatus;
}) {
  return input.role === "admin" || input.companyStatus === "active";
}
