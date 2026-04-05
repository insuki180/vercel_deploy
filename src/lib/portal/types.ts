import type { CompanyStatus, LeaveBalance, LeavePolicy, LeaveType } from "@/lib/domain/types";

export type PortalRole = "admin" | "employer" | "employee";

export type EmployeeStatus =
  | "draft"
  | "pending_onboarding"
  | "pending_verification"
  | "active"
  | "offboarding"
  | "inactive";

export type HiringRequestStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "onboarding_open";

export type OnboardingStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "expired";

export type DocumentStatus = "pending" | "approved" | "rejected";
export type LeaveRequestStatus = "pending" | "approved" | "rejected";
export type ResignationStatus = "pending" | "approved" | "rejected";
export type OffboardingStatus = "pending" | "in_progress" | "completed";
export type PayrollStatus = "draft" | "generated";

export interface PortalUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: PortalRole;
  companyId?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
}

export interface CompanyRecord {
  id: string;
  name: string;
  country: string;
  clientCountry: string;
  status: CompanyStatus;
  createdAt: string;
  primaryContactName: string;
  primaryContactEmail: string;
}

export interface EmployerProfile {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  title: string;
  phone: string;
  status: "active" | "inactive";
}

export interface EmployeeRecord {
  id: string;
  companyId: string;
  userId?: string;
  workEmail: string;
  personalEmail?: string;
  fullName: string;
  phone: string;
  designation: string;
  contractType: string;
  workLocation: string;
  country: string;
  salary: number;
  currency: string;
  joiningDate: string;
  status: EmployeeStatus;
  payrollReady: boolean;
  leavePolicy: LeavePolicy;
}

export interface HiringRequestRecord {
  id: string;
  companyId: string;
  submittedByUserId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  designation: string;
  contractType: string;
  workLocation: string;
  targetJoiningDate: string;
  proposedSalary: number;
  currency: string;
  leavePolicy: LeavePolicy;
  status: HiringRequestStatus;
  notes: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface OnboardingRequestRecord {
  id: string;
  hiringRequestId: string;
  employeeId: string;
  companyId: string;
  token: string;
  status: OnboardingStatus;
  expiresAt: string;
  invitedAt: string;
  completedAt?: string;
}

export interface EmployeeBankDetailsRecord {
  employeeId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  pan: string;
  aadhaarLast4: string;
  uan?: string;
  esiNumber?: string;
}

export interface EmployeeDocumentRecord {
  id: string;
  employeeId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface LifecycleEventRecord {
  id: string;
  employeeId: string;
  type: string;
  status: string;
  createdAt: string;
  detail: string;
}

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  companyId: string;
  leaveType: LeaveType;
  requestedDays: number;
  paidDays: number;
  lossOfPayDays: number;
  status: LeaveRequestStatus;
  reason: string;
  startDate: string;
  endDate: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface ResignationRecord {
  id: string;
  employeeId: string;
  companyId: string;
  reason: string;
  status: ResignationStatus;
  submittedAt: string;
  lastWorkingDate: string;
}

export interface OffboardingCaseRecord {
  id: string;
  employeeId: string;
  companyId: string;
  status: OffboardingStatus;
  checklistSummary: string;
  finalSettlementStatus: "pending" | "ready" | "completed";
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  companyId: string;
  month: string;
  baseSalary: number;
  tax: number;
  lossOfPayDeduction: number;
  netSalary: number;
  status: PayrollStatus;
  createdAt: string;
}

export interface PayslipRecord {
  id: string;
  payrollId: string;
  employeeId: string;
  month: string;
  fileName: string;
  createdAt: string;
}

export interface PortalState {
  users: PortalUser[];
  companies: CompanyRecord[];
  employers: EmployerProfile[];
  employees: EmployeeRecord[];
  hiringRequests: HiringRequestRecord[];
  onboardingRequests: OnboardingRequestRecord[];
  bankDetails: EmployeeBankDetailsRecord[];
  documents: EmployeeDocumentRecord[];
  lifecycleEvents: LifecycleEventRecord[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequestRecord[];
  resignations: ResignationRecord[];
  offboardingCases: OffboardingCaseRecord[];
  payrolls: PayrollRecord[];
  payslips: PayslipRecord[];
}

export interface DashboardSummaryCard {
  label: string;
  value: string;
  hint: string;
  tone?: "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";
}
