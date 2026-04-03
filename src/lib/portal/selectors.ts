import "server-only";

import type { LeaveBalance } from "@/lib/domain/types";
import { canRunOperationalActionsForCompany } from "@/lib/domain/access";
import { getPortalSnapshot } from "@/lib/portal/backend";
import type {
  CompanyRecord,
  DashboardSummaryCard,
  EmployeeRecord,
  EmployerProfile,
  PortalRole,
  PortalUser,
} from "@/lib/portal/types";

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCompanyForUser(_user: PortalUser): CompanyRecord | undefined {
  void _user;
  throw new Error("getCompanyForUser must be called through getScopedSelectors");
}

export function getEmployerProfile(_user: PortalUser): EmployerProfile | undefined {
  void _user;
  throw new Error("getEmployerProfile must be called through getScopedSelectors");
}

export function getEmployeeForUser(_user: PortalUser): EmployeeRecord | undefined {
  void _user;
  throw new Error("getEmployeeForUser must be called through getScopedSelectors");
}

export function getLeaveBalancesForEmployee(_employeeId: string): LeaveBalance[] {
  void _employeeId;
  throw new Error("getLeaveBalancesForEmployee must be called through getScopedSelectors");
}

export async function getScopedSelectors(user: PortalUser) {
  const state = await getPortalSnapshot();
  const company = user.companyId
    ? state.companies.find((entry) => entry.id === user.companyId)
    : undefined;
  const employerProfile = state.employers.find((entry) => entry.userId === user.id);
  const employee = user.employeeId
    ? state.employees.find((entry) => entry.id === user.employeeId)
    : undefined;
  const getLeaveBalancesForEmployeeScoped = (employeeId: string) =>
    state.leaveBalances.filter((entry) => entry.employeeId === employeeId);

  if (user.role === "admin") {
    return {
      state,
      company,
      employerProfile,
      employee,
      leaveBalancesForEmployee: getLeaveBalancesForEmployeeScoped,
    };
  }

  if (!company) {
    const emptyState = {
      ...state,
      companies: [],
      employers: [],
      employees: [],
      hiringRequests: [],
      onboardingRequests: [],
      bankDetails: [],
      documents: [],
      lifecycleEvents: [],
      leaveBalances: [],
      leaveRequests: [],
      resignations: [],
      offboardingCases: [],
      payrolls: [],
      payslips: [],
    };
    return {
      state: emptyState,
      company: undefined,
      employerProfile,
      employee,
      leaveBalancesForEmployee: getLeaveBalancesForEmployeeScoped,
    };
  }

  const employeeIds = state.employees
    .filter((employee) => employee.companyId === company.id)
    .map((employee) => employee.id);

  return {
    company,
    employerProfile,
    employee,
    leaveBalancesForEmployee: getLeaveBalancesForEmployeeScoped,
    state: {
    ...state,
    companies: [company],
    employers: state.employers.filter((entry) => entry.companyId === company.id),
    employees: state.employees.filter((entry) => entry.companyId === company.id),
    hiringRequests: state.hiringRequests.filter((entry) => entry.companyId === company.id),
    onboardingRequests: state.onboardingRequests.filter((entry) => entry.companyId === company.id),
    bankDetails: state.bankDetails.filter((entry) => employeeIds.includes(entry.employeeId)),
    documents: state.documents.filter((entry) => employeeIds.includes(entry.employeeId)),
    lifecycleEvents: state.lifecycleEvents.filter((entry) => employeeIds.includes(entry.employeeId)),
    leaveBalances: state.leaveBalances.filter((entry) => employeeIds.includes(entry.employeeId)),
    leaveRequests: state.leaveRequests.filter((entry) => entry.companyId === company.id),
    resignations: state.resignations.filter((entry) => entry.companyId === company.id),
    offboardingCases: state.offboardingCases.filter((entry) => entry.companyId === company.id),
    payrolls: state.payrolls.filter((entry) => entry.companyId === company.id),
    payslips: state.payslips.filter((entry) => employeeIds.includes(entry.employeeId)),
  }};
}

export async function getDashboardMetrics(role: PortalRole, user: PortalUser): Promise<DashboardSummaryCard[]> {
  const scoped = await getScopedSelectors(user);
  const snapshot = scoped.state;
  const company = scoped.company;

  if (role === "admin") {
    return [
      {
        label: "Companies",
        value: String(snapshot.companies.length),
        hint: `${snapshot.companies.filter((company) => company.status === "inactive").length} inactive clients`,
        tone: "blue",
      },
      {
        label: "Employees",
        value: String(snapshot.employees.length),
        hint: `${snapshot.employees.filter((employee) => employee.status === "active").length} active`,
        tone: "emerald",
      },
      {
        label: "Pending Hires",
        value: String(snapshot.hiringRequests.filter((entry) => entry.status === "submitted").length),
        hint: "Employer demand awaiting review",
        tone: "amber",
      },
      {
        label: "Payroll This Cycle",
        value: formatCurrency(
          snapshot.employees
            .filter((employee) => employee.status === "active")
            .reduce((sum, employee) => sum + employee.salary, 0),
        ),
        hint: "Projected active salary base",
        tone: "violet",
      },
    ];
  }

  if (role === "employer") {
    return [
      {
        label: "Company Status",
        value: company?.status === "inactive" ? "Inactive" : "Active",
        hint: canRunOperationalActionsForCompany({
          role: "employer",
          companyStatus: company?.status ?? "active",
        })
          ? "Operational actions enabled"
          : "Operational actions blocked",
        tone: company?.status === "inactive" ? "rose" : "emerald",
      },
      {
        label: "Team Size",
        value: String(snapshot.employees.length),
        hint: `${snapshot.employees.filter((employee) => employee.status === "active").length} active employees`,
        tone: "blue",
      },
      {
        label: "Pending Actions",
        value: String(
          snapshot.leaveRequests.filter((entry) => entry.status === "pending").length +
            snapshot.resignations.filter((entry) => entry.status === "pending").length,
        ),
        hint: "Leave and resignation approvals",
        tone: "amber",
      },
      {
        label: "Open Hiring",
        value: String(
          snapshot.hiringRequests.filter((entry) => ["submitted", "onboarding_open"].includes(entry.status)).length,
        ),
        hint: "Submitted and active onboarding requests",
        tone: "violet",
      },
    ];
  }

  const employee = scoped.employee;
  const balances = employee ? scoped.leaveBalancesForEmployee(employee.id) : [];
  const remainingLeaves = balances.reduce((sum, balance) => sum + balance.remaining, 0);

  return [
    {
      label: "Status",
      value: employee?.status?.replaceAll("_", " ") ?? "Unknown",
      hint: employee?.payrollReady ? "Payroll ready" : "Needs admin verification",
      tone: employee?.status === "active" ? "emerald" : "amber",
    },
    {
      label: "Net Salary",
      value: formatCurrency(employee?.salary ?? 0),
      hint: "Current monthly base used for payroll",
      tone: "blue",
    },
    {
      label: "Leave Remaining",
      value: String(remainingLeaves),
      hint: "Across approved paid leave buckets",
      tone: "amber",
    },
    {
      label: "Payslips",
      value: String(snapshot.payslips.filter((entry) => entry.employeeId === employee?.id).length),
      hint: "Generated payroll artifacts",
      tone: "violet",
    },
  ];
}
