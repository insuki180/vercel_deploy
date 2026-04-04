import "server-only";

import { buildEmployeeLeaveBalances, evaluateLeaveRequest, settleApprovedLeave } from "@/lib/domain/leave";
import { calculatePayrollRecord } from "@/lib/domain/payroll";
import { getPortalState, mutatePortalState } from "@/lib/portal/demo-store";
import { createPortalId } from "@/lib/portal/ids";
import type {
  CompanyRecord,
  EmployeeDocumentRecord,
  EmployerProfile,
  LeaveRequestRecord,
  OffboardingCaseRecord,
  OnboardingRequestRecord,
  PayrollRecord,
  PortalState,
  PortalUser,
  ResignationRecord,
} from "@/lib/portal/types";
import { getPortalBackendMode, hasSupabaseServiceRole } from "@/lib/supabase/env";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { LeavePolicy } from "@/lib/domain/types";

type SupabaseRecord = Record<string, unknown>;

function toPortalRole(role: unknown): PortalUser["role"] {
  if (role === "admin" || role === "employer" || role === "employee") {
    return role;
  }
  return "employee";
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value ?? fallback);
}

function mapCompanies(rows: SupabaseRecord[]): CompanyRecord[] {
  return rows.map((row) => ({
    id: safeString(row.id),
    name: safeString(row.name),
    country: safeString(row.country, "India"),
    clientCountry: safeString(row.client_country),
    status: safeString(row.status, "active") as CompanyRecord["status"],
    createdAt: safeString(row.created_at),
    primaryContactName: safeString(row.primary_contact_name),
    primaryContactEmail: safeString(row.primary_contact_email),
  }));
}

function mapUsers(rows: SupabaseRecord[], authEmails = new Map<string, string>()): PortalUser[] {
  return rows.map((row) => ({
    id: safeString(row.id),
    email: authEmails.get(safeString(row.id)) ?? safeString(row.email),
    password: "",
    name: safeString(row.full_name),
    role: toPortalRole(row.role),
    companyId: safeString(row.company_id) || undefined,
    employeeId: safeString(row.employee_id) || undefined,
  }));
}

function mapEmployees(rows: SupabaseRecord[]): PortalState["employees"] {
  return rows.map((row) => ({
    id: safeString(row.id),
    companyId: safeString(row.company_id),
    userId: safeString(row.user_id) || undefined,
    workEmail: safeString(row.work_email),
    personalEmail: safeString(row.personal_email) || undefined,
    fullName: safeString(row.full_name),
    phone: safeString(row.phone),
    designation: safeString(row.designation),
    contractType: safeString(row.contract_type),
    workLocation: safeString(row.work_location),
    country: safeString(row.country, "India"),
    salary: safeNumber(row.salary),
    currency: safeString(row.currency, "INR"),
    joiningDate: safeString(row.joining_date),
    status: safeString(row.status, "draft") as PortalState["employees"][number]["status"],
    payrollReady: Boolean(row.payroll_ready),
    leavePolicy: {
      casual: 0,
      sick: 0,
      earned: 0,
    },
  }));
}

function buildEmptyState(): PortalState {
  return {
    users: [],
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
}

function createId(_prefix: string) {
  void _prefix;
  return createPortalId();
}

function nowIso() {
  return new Date().toISOString();
}

function ensureSupabaseWritable() {
  return (
    getPortalBackendMode() === "supabase" &&
    hasSupabaseServiceRole({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
  );
}

export async function getPortalSnapshot(): Promise<PortalState> {
  if (
    getPortalBackendMode() === "demo" ||
    !hasSupabaseServiceRole({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
  ) {
    return getPortalState();
  }

  const supabase = createSupabaseAdminClient();
  const authUsersRes = await supabase.auth.admin.listUsers();
  const authEmails = new Map(
    (authUsersRes.data?.users ?? []).map((entry) => [entry.id, entry.email ?? ""]),
  );
  const [
    profilesRes,
    companiesRes,
    companyUsersRes,
    employeesRes,
    hiringRes,
    onboardingRes,
    bankRes,
    documentsRes,
    leavePoliciesRes,
    leaveBalancesRes,
    leaveRequestsRes,
    resignationsRes,
    offboardingRes,
    lifecycleRes,
    payrollsRes,
    payslipsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("companies").select("*"),
    supabase.from("company_users").select("*, profiles(full_name)"),
    supabase.from("employees").select("*"),
    supabase.from("hiring_requests").select("*"),
    supabase.from("employee_onboarding_requests").select("*"),
    supabase.from("employee_bank_details").select("*"),
    supabase.from("documents").select("*"),
    supabase.from("leave_policies").select("*"),
    supabase.from("employee_leave_balances").select("*"),
    supabase.from("leave_requests").select("*"),
    supabase.from("resignations").select("*"),
    supabase.from("offboarding_cases").select("*"),
    supabase.from("employee_lifecycle_events").select("*"),
    supabase.from("payrolls").select("*"),
    supabase.from("payslips").select("*"),
  ]);

  const state = buildEmptyState();
  state.users = mapUsers((profilesRes.data ?? []) as SupabaseRecord[], authEmails);
  state.companies = mapCompanies((companiesRes.data ?? []) as SupabaseRecord[]);
  state.employers = ((companyUsersRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    companyId: safeString(row.company_id),
    userId: safeString(row.profile_id),
    name: safeString((row.profiles as SupabaseRecord | null)?.full_name),
    title: safeString(row.title),
    phone: safeString(row.phone),
    status: safeString(row.status, "active") as EmployerProfile["status"],
  }));
  state.employees = mapEmployees((employeesRes.data ?? []) as SupabaseRecord[]);
  state.hiringRequests = ((hiringRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    companyId: safeString(row.company_id),
    submittedByUserId: safeString(row.submitted_by),
    candidateName: safeString(row.candidate_name),
    candidateEmail: safeString(row.candidate_email),
    candidatePhone: safeString(row.candidate_phone),
    designation: safeString(row.designation),
    contractType: safeString(row.contract_type),
    workLocation: safeString(row.work_location),
    targetJoiningDate: safeString(row.target_joining_date),
    proposedSalary: safeNumber(row.proposed_salary),
    currency: safeString(row.currency, "INR"),
    leavePolicy: (row.leave_policy as PortalState["hiringRequests"][number]["leavePolicy"]) ?? {
      casual: 0,
      sick: 0,
      earned: 0,
    },
    status: safeString(row.status, "submitted") as PortalState["hiringRequests"][number]["status"],
    notes: safeString(row.notes),
    submittedAt: safeString(row.submitted_at),
    reviewedAt: safeString(row.reviewed_at) || undefined,
  }));
  state.onboardingRequests = ((onboardingRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    hiringRequestId: safeString(row.hiring_request_id),
    employeeId: safeString(row.employee_id),
    companyId: safeString(row.company_id),
    token: safeString(row.token),
    status: safeString(row.status, "pending") as OnboardingRequestRecord["status"],
    expiresAt: safeString(row.expires_at),
    invitedAt: safeString(row.invited_at),
    completedAt: safeString(row.completed_at) || undefined,
  }));
  state.bankDetails = ((bankRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    employeeId: safeString(row.employee_id),
    bankName: safeString(row.bank_name),
    accountNumber: safeString(row.account_number),
    ifscCode: safeString(row.ifsc_code),
    pan: safeString(row.pan),
    aadhaarLast4: safeString(row.aadhaar_last4),
    uan: safeString(row.uan) || undefined,
    esiNumber: safeString(row.esi_number) || undefined,
  }));
  state.documents = ((documentsRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    type: safeString(row.type),
    fileName: safeString(row.file_name),
    fileUrl: safeString(row.file_url),
    status: safeString(row.status, "pending") as EmployeeDocumentRecord["status"],
    uploadedAt: safeString(row.created_at),
  }));
  state.lifecycleEvents = ((lifecycleRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    type: safeString(row.event_type),
    status: safeString(row.status),
    createdAt: safeString(row.created_at),
    detail: safeString(row.detail),
  }));
  state.leaveBalances = ((leaveBalancesRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    employeeId: safeString(row.employee_id),
    leaveType: safeString(row.leave_type, "casual") as "casual" | "sick" | "earned",
    allocated: safeNumber(row.allocated),
    used: safeNumber(row.used),
    remaining: safeNumber(row.remaining),
  }));
  state.leaveRequests = ((leaveRequestsRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    companyId: safeString(row.company_id),
    leaveType: safeString(row.leave_type, "casual") as "casual" | "sick" | "earned",
    requestedDays: safeNumber(row.requested_days),
    paidDays: safeNumber(row.paid_days),
    lossOfPayDays: safeNumber(row.loss_of_pay_days),
    status: safeString(row.status, "pending") as LeaveRequestRecord["status"],
    reason: safeString(row.reason),
    startDate: safeString(row.start_date),
    endDate: safeString(row.end_date),
    submittedAt: safeString(row.submitted_at),
    reviewedAt: safeString(row.reviewed_at) || undefined,
  }));
  state.resignations = ((resignationsRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    companyId: safeString(row.company_id),
    reason: safeString(row.reason),
    status: safeString(row.status, "pending") as ResignationRecord["status"],
    submittedAt: safeString(row.created_at),
    lastWorkingDate: safeString(row.last_working_date),
  }));
  state.offboardingCases = ((offboardingRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    companyId: safeString(row.company_id),
    status: safeString(row.status, "pending") as OffboardingCaseRecord["status"],
    checklistSummary: safeString(row.checklist_summary),
    finalSettlementStatus: safeString(row.final_settlement_status) as OffboardingCaseRecord["finalSettlementStatus"],
    createdAt: safeString(row.created_at),
  }));
  state.payrolls = ((payrollsRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    employeeId: safeString(row.employee_id),
    companyId: safeString(row.company_id),
    month: safeString(row.month),
    baseSalary: safeNumber(row.base_salary),
    tax: safeNumber(row.tax),
    lossOfPayDeduction: safeNumber(row.loss_of_pay_deduction),
    netSalary: safeNumber(row.net_salary),
    status: safeString(row.status, "draft") as PayrollRecord["status"],
    createdAt: safeString(row.created_at),
  }));
  state.payslips = ((payslipsRes.data ?? []) as SupabaseRecord[]).map((row) => ({
    id: safeString(row.id),
    payrollId: safeString(row.payroll_id),
    employeeId: safeString(row.employee_id),
    month: safeString(row.month),
    fileName: safeString(row.file_name),
    createdAt: safeString(row.created_at),
  }));

  const policyByEmployee = new Map(
    ((leavePoliciesRes.data ?? []) as SupabaseRecord[])
      .filter((row) => row.employee_id)
      .map((row) => [
        safeString(row.employee_id),
        {
          casual: safeNumber(row.casual),
          sick: safeNumber(row.sick),
          earned: safeNumber(row.earned),
        },
      ]),
  );
  const defaultPolicyByCompany = new Map(
    ((leavePoliciesRes.data ?? []) as SupabaseRecord[])
      .filter((row) => row.company_id && !row.employee_id)
      .map((row) => [
        safeString(row.company_id),
        {
          casual: safeNumber(row.casual),
          sick: safeNumber(row.sick),
          earned: safeNumber(row.earned),
        },
      ]),
  );

  state.employees = state.employees.map((employee) => ({
    ...employee,
    leavePolicy:
      policyByEmployee.get(employee.id) ??
      defaultPolicyByCompany.get(employee.companyId) ?? {
        casual: 0,
        sick: 0,
        earned: 0,
      },
  }));

  if (!state.leaveBalances.length) {
    state.leaveBalances = state.employees.flatMap((employee) =>
      buildEmployeeLeaveBalances({
        employeeId: employee.id,
        policy: employee.leavePolicy,
      }),
    );
  }

  return state;
}

export async function getCurrentPortalUser() {
  if (getPortalBackendMode() === "demo") {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const snapshot = await getPortalSnapshot();
  const matchedUser = snapshot.users.find((entry) => entry.id === user.id);
  if (!matchedUser) {
    return null;
  }

  return {
    ...matchedUser,
    email: user.email ?? matchedUser.email,
  };
}

export async function loginWithSupabase(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function logoutFromSupabase() {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.signOut();
}

export async function createCompanyInBackend(input: {
  name: string;
  clientCountry: string;
  contactName: string;
  contactEmail: string;
  createdBy?: string;
}) {
  if (
    getPortalBackendMode() === "demo" ||
    !hasSupabaseServiceRole({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
  ) {
    mutatePortalState((state) => {
      state.companies.unshift({
        id: `company_${Math.random().toString(36).slice(2, 10)}`,
        name: input.name,
        country: "India",
        clientCountry: input.clientCountry,
        status: "active",
        createdAt: new Date().toISOString(),
        primaryContactName: input.contactName,
        primaryContactEmail: input.contactEmail,
      });
    });
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("companies").insert({
    name: input.name,
    country: "India",
    client_country: input.clientCountry,
    status: "active",
    created_by: input.createdBy,
    primary_contact_name: input.contactName,
    primary_contact_email: input.contactEmail,
  });
}

export async function createAdminInBackend(input: {
  fullName: string;
  email: string;
  password: string;
}) {
  if (!ensureSupabaseWritable()) {
    mutatePortalState((state) => {
      state.users.unshift({
        id: createId("user"),
        email: input.email,
        password: input.password,
        name: input.fullName,
        role: "admin",
      });
    });
    return;
  }

  const authUser = await getOrCreateAuthUser(input.email, input.password, input.fullName);
  const supabase = createSupabaseAdminClient();
  await supabase.from("profiles").upsert({
    id: authUser.id,
    role: "admin",
    full_name: input.fullName,
  });
}

export async function toggleCompanyStatusInBackend(companyId: string) {
  if (!ensureSupabaseWritable()) {
    mutatePortalState((state) => {
      const company = state.companies.find((entry) => entry.id === companyId);
      if (company) {
        company.status = company.status === "active" ? "inactive" : "active";
      }
    });
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("companies").select("status").eq("id", companyId).single();
  const nextStatus = data?.status === "active" ? "inactive" : "active";
  await supabase.from("companies").update({ status: nextStatus }).eq("id", companyId);
}

export async function createHiringRequestInBackend(input: {
  companyId: string;
  submittedByUserId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  designation: string;
  contractType: string;
  workLocation: string;
  targetJoiningDate?: string;
  proposedSalary: number;
  currency: string;
  leavePolicy: LeavePolicy;
  notes: string;
}) {
  if (!ensureSupabaseWritable()) {
    mutatePortalState((state) => {
      state.hiringRequests.unshift({
        id: createId("hire"),
        companyId: input.companyId,
        submittedByUserId: input.submittedByUserId,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidatePhone: input.candidatePhone,
        designation: input.designation,
        contractType: input.contractType,
        workLocation: input.workLocation,
        targetJoiningDate: input.targetJoiningDate ?? "",
        proposedSalary: input.proposedSalary,
        currency: input.currency,
        leavePolicy: input.leavePolicy,
        status: "submitted",
        notes: input.notes,
        submittedAt: nowIso(),
      });
    });
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("hiring_requests").insert({
    company_id: input.companyId,
    submitted_by: input.submittedByUserId,
    candidate_name: input.candidateName,
    candidate_email: input.candidateEmail,
    candidate_phone: input.candidatePhone,
    designation: input.designation,
    contract_type: input.contractType,
    work_location: input.workLocation,
    target_joining_date: input.targetJoiningDate || null,
    proposed_salary: input.proposedSalary,
    currency: input.currency,
    leave_policy: input.leavePolicy,
    status: "submitted",
    notes: input.notes,
  });
}

export async function reviewHiringRequestInBackend(input: {
  hiringRequestId: string;
  decision: "approved" | "rejected";
  leavePolicy: LeavePolicy;
}) {
  if (!ensureSupabaseWritable()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: request } = await supabase
    .from("hiring_requests")
    .select("*")
    .eq("id", input.hiringRequestId)
    .single();

  if (!request) {
    return;
  }

  await supabase
    .from("hiring_requests")
    .update({
      status: input.decision === "rejected" ? "rejected" : "onboarding_open",
      reviewed_at: nowIso(),
      leave_policy: input.leavePolicy,
    })
    .eq("id", input.hiringRequestId);

  if (input.decision === "rejected") {
    return;
  }

  const employeeId = createId("employee");
  await supabase.from("employees").insert({
    id: employeeId,
    company_id: request.company_id,
    full_name: request.candidate_name,
    work_email: request.candidate_email,
    phone: request.candidate_phone,
    designation: request.designation,
    contract_type: request.contract_type,
    work_location: request.work_location,
    country: "India",
    salary: request.proposed_salary,
    currency: request.currency,
    status: "pending_onboarding",
    payroll_ready: false,
    joining_date: request.target_joining_date,
  });

  await supabase.from("employee_onboarding_requests").insert({
    hiring_request_id: input.hiringRequestId,
    employee_id: employeeId,
    company_id: request.company_id,
    token: `invite-${employeeId}`,
    status: "pending",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  });

  await supabase.from("leave_policies").insert({
    company_id: request.company_id,
    employee_id: employeeId,
    casual: input.leavePolicy.casual,
    sick: input.leavePolicy.sick,
    earned: input.leavePolicy.earned,
  });

  await supabase.from("employee_leave_balances").insert(
    buildEmployeeLeaveBalances({ employeeId, policy: input.leavePolicy }).map((entry) => ({
      employee_id: entry.employeeId,
      leave_type: entry.leaveType,
      allocated: entry.allocated,
      used: entry.used,
      remaining: entry.remaining,
    })),
  );

  await supabase.from("employee_lifecycle_events").insert({
    employee_id: employeeId,
    event_type: "hiring_request",
    status: "approved",
    detail: "Admin approved hiring request and opened onboarding.",
  });
}

async function getOrCreateAuthUser(email: string, password: string, fullName: string) {
  const supabase = createSupabaseAdminClient();
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function completeOnboardingInBackend(input: {
  token: string;
  personalEmail: string;
  phone: string;
  password: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  pan: string;
  aadhaarLast4: string;
  uan?: string;
  esiNumber?: string;
  documents: Array<{ type: string; fileName: string }>;
}) {
  if (!ensureSupabaseWritable()) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: onboarding } = await supabase
    .from("employee_onboarding_requests")
    .select("*, employees(*)")
    .eq("token", input.token)
    .single();

  if (!onboarding) {
    return;
  }

  const employee = onboarding.employees as SupabaseRecord;
  const authUser = await getOrCreateAuthUser(
    safeString(employee.work_email),
    input.password,
    safeString(employee.full_name),
  );

  await supabase.from("profiles").upsert({
    id: authUser.id,
    role: "employee",
    full_name: safeString(employee.full_name),
    company_id: safeString(employee.company_id),
    employee_id: safeString(employee.id),
  });

  await supabase
    .from("employees")
    .update({
      user_id: authUser.id,
      personal_email: input.personalEmail,
      phone: input.phone,
      status: "pending_verification",
    })
    .eq("id", safeString(employee.id));

  await supabase.from("employee_bank_details").upsert({
    employee_id: safeString(employee.id),
    bank_name: input.bankName,
    account_number: input.accountNumber,
    ifsc_code: input.ifscCode,
    pan: input.pan,
    aadhaar_last4: input.aadhaarLast4,
    uan: input.uan,
    esi_number: input.esiNumber,
  });

  await supabase.from("documents").delete().eq("employee_id", safeString(employee.id));
  await supabase.from("documents").insert(
    input.documents.map((document) => ({
      employee_id: safeString(employee.id),
      type: document.type,
      file_name: document.fileName,
      file_url: `/documents/${safeString(employee.id)}/${document.type.toLowerCase().replaceAll(" ", "-")}`,
      status: "pending",
    })),
  );

  await supabase
    .from("employee_onboarding_requests")
    .update({
      status: "submitted",
      completed_at: nowIso(),
    })
    .eq("token", input.token);

  await supabase.from("employee_lifecycle_events").insert({
    employee_id: safeString(employee.id),
    event_type: "onboarding",
    status: "submitted",
    detail: "Employee completed onboarding details and uploaded documents.",
  });
}

export async function approveEmployeeInBackend(employeeId: string) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("employees")
    .update({ status: "active", payroll_ready: true })
    .eq("id", employeeId);
  await supabase
    .from("employee_onboarding_requests")
    .update({ status: "approved" })
    .eq("employee_id", employeeId);
  await supabase
    .from("documents")
    .update({ status: "approved" })
    .eq("employee_id", employeeId);
  await supabase.from("employee_lifecycle_events").insert({
    employee_id: employeeId,
    event_type: "activation",
    status: "approved",
    detail: "Admin verified documents and activated employee.",
  });
}

export async function uploadEmployeeDocumentInBackend(input: {
  employeeId: string;
  type: string;
  fileName: string;
}) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  await supabase.from("documents").insert({
    employee_id: input.employeeId,
    type: input.type,
    file_name: input.fileName,
    file_url: `/documents/${input.employeeId}/${Date.now()}`,
    status: "pending",
  });
}

export async function submitLeaveRequestInBackend(input: {
  employeeId: string;
  leaveType: "casual" | "sick" | "earned";
  requestedDays: number;
  reason: string;
  startDate: string;
  endDate: string;
}) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("id", input.employeeId)
    .single();
  const { data: balancesRows } = await supabase
    .from("employee_leave_balances")
    .select("*")
    .eq("employee_id", input.employeeId);
  const balances = (balancesRows ?? []).map((row) => ({
    employeeId: safeString(row.employee_id),
    leaveType: safeString(row.leave_type) as "casual" | "sick" | "earned",
    allocated: safeNumber(row.allocated),
    used: safeNumber(row.used),
    remaining: safeNumber(row.remaining),
  }));
  const evaluation = evaluateLeaveRequest({
    balances,
    leaveType: input.leaveType,
    requestedDays: input.requestedDays,
  });
  await supabase.from("leave_requests").insert({
    employee_id: input.employeeId,
    company_id: safeString(employee?.company_id),
    leave_type: input.leaveType,
    requested_days: input.requestedDays,
    paid_days: evaluation.paidDays,
    loss_of_pay_days: evaluation.lossOfPayDays,
    status: "pending",
    reason: input.reason,
    start_date: input.startDate,
    end_date: input.endDate,
  });
}

export async function reviewLeaveRequestInBackend(leaveRequestId: string, decision: "approved" | "rejected") {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: request } = await supabase.from("leave_requests").select("*").eq("id", leaveRequestId).single();
  if (!request) return;
  await supabase
    .from("leave_requests")
    .update({ status: decision, reviewed_at: nowIso() })
    .eq("id", leaveRequestId);
  if (decision !== "approved") return;

  const { data: balancesRows } = await supabase
    .from("employee_leave_balances")
    .select("*")
    .eq("employee_id", safeString(request.employee_id));
  const balances = (balancesRows ?? []).map((row) => ({
    employeeId: safeString(row.employee_id),
    leaveType: safeString(row.leave_type) as "casual" | "sick" | "earned",
    allocated: safeNumber(row.allocated),
    used: safeNumber(row.used),
    remaining: safeNumber(row.remaining),
  }));
  const nextBalances = settleApprovedLeave({
    balances,
    leaveType: safeString(request.leave_type) as "casual" | "sick" | "earned",
    requestedDays: safeNumber(request.requested_days),
  });
  for (const balance of nextBalances) {
    await supabase
      .from("employee_leave_balances")
      .update({
        allocated: balance.allocated,
        used: balance.used,
        remaining: balance.remaining,
      })
      .eq("employee_id", balance.employeeId)
      .eq("leave_type", balance.leaveType);
  }
}

export async function runPayrollInBackend(month: string) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .eq("status", "active")
    .eq("payroll_ready", true);
  for (const employee of employees ?? []) {
    const { data: leaveRows } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", safeString(employee.id))
      .eq("status", "approved");
    const approvedLossOfPayDays = (leaveRows ?? [])
      .filter((row) => safeString(row.start_date).startsWith(month))
      .reduce((sum, row) => sum + safeNumber(row.loss_of_pay_days), 0);
    const payroll = calculatePayrollRecord({
      baseSalary: safeNumber(employee.salary),
      taxRate: 0.1,
      workingDaysInMonth: 30,
      approvedLossOfPayDays,
    });
    const payrollId = createId("pay");
    await supabase.from("payrolls").insert({
      id: payrollId,
      employee_id: safeString(employee.id),
      company_id: safeString(employee.company_id),
      month,
      base_salary: payroll.baseSalary,
      tax: payroll.tax,
      loss_of_pay_deduction: payroll.lossOfPayDeduction,
      net_salary: payroll.netSalary,
      status: "generated",
    });
    await supabase.from("payslips").insert({
      payroll_id: payrollId,
      employee_id: safeString(employee.id),
      month,
      file_name: `${safeString(employee.full_name).toLowerCase().replaceAll(" ", "-")}-${month}.pdf`,
      file_url: `/api/payslips/${payrollId}`,
    });
  }
}

export async function submitResignationInBackend(input: {
  employeeId: string;
  reason: string;
  lastWorkingDate: string;
}) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("company_id")
    .eq("id", input.employeeId)
    .single();
  await supabase.from("resignations").insert({
    employee_id: input.employeeId,
    company_id: safeString(employee?.company_id),
    reason: input.reason,
    status: "pending",
    last_working_date: input.lastWorkingDate,
  });
}

export async function reviewResignationInBackend(resignationId: string, decision: "approved" | "rejected") {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: resignation } = await supabase
    .from("resignations")
    .select("*")
    .eq("id", resignationId)
    .single();
  if (!resignation) return;
  await supabase.from("resignations").update({ status: decision }).eq("id", resignationId);
  if (decision !== "approved") return;
  await supabase
    .from("employees")
    .update({ status: "offboarding" })
    .eq("id", safeString(resignation.employee_id));
  await supabase.from("offboarding_cases").insert({
    employee_id: safeString(resignation.employee_id),
    company_id: safeString(resignation.company_id),
    status: "pending",
    checklist_summary: "Exit docs, F&F settlement, access revocation",
    final_settlement_status: "pending",
  });
}

export async function updateOffboardingStatusInBackend(
  offboardingId: string,
  status: "in_progress" | "completed",
) {
  if (!ensureSupabaseWritable()) {
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { data: offboarding } = await supabase
    .from("offboarding_cases")
    .select("*")
    .eq("id", offboardingId)
    .single();
  if (!offboarding) return;
  await supabase
    .from("offboarding_cases")
    .update({
      status,
      final_settlement_status: status === "completed" ? "completed" : "ready",
    })
    .eq("id", offboardingId);
  if (status === "completed") {
    await supabase
      .from("employees")
      .update({ status: "inactive", payroll_ready: false })
      .eq("id", safeString(offboarding.employee_id));
  }
}
