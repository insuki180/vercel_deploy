"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { calculatePayrollRecord } from "@/lib/domain/payroll";
import { buildEmployeeLeaveBalances, evaluateLeaveRequest, settleApprovedLeave } from "@/lib/domain/leave";
import { getDefaultRoleHref } from "@/components/portal/route-section";
import {
  approveEmployeeInBackend,
  completeOnboardingInBackend,
  createAdminInBackend,
  createCompanyInBackend,
  createHiringRequestInBackend,
  loginWithSupabase,
  logoutFromSupabase,
  reviewHiringRequestInBackend,
  reviewLeaveRequestInBackend,
  reviewResignationInBackend,
  runPayrollInBackend,
  submitLeaveRequestInBackend,
  submitResignationInBackend,
  toggleCompanyStatusInBackend,
  updateOffboardingStatusInBackend,
  uploadEmployeeDocumentInBackend,
} from "@/lib/portal/backend";
import { getPortalState, mutatePortalState } from "@/lib/portal/demo-store";
import { createPortalId } from "@/lib/portal/ids";
import { SESSION_COOKIE } from "@/lib/portal/session";
import { getPortalBackendMode } from "@/lib/supabase/env";
import type { LeavePolicy } from "@/lib/domain/types";
import type { CreateCompanyActionState } from "@/lib/portal/action-states";
import type { EmployeeDocumentRecord } from "@/lib/portal/types";

function createId(_prefix: string) {
  void _prefix;
  return createPortalId();
}

function nowIso() {
  return new Date().toISOString();
}

function parseLeavePolicy(formData: FormData): LeavePolicy {
  return {
    casual: Number(formData.get("leaveCasual") ?? 0),
    sick: Number(formData.get("leaveSick") ?? 0),
    earned: Number(formData.get("leaveEarned") ?? 0),
  };
}

function optionalFormString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function touchPortalPaths() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/employer");
  revalidatePath("/employee");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (getPortalBackendMode() === "supabase") {
    const { data, error } = await loginWithSupabase(email, password);
    if (error) {
      redirect("/login?error=invalid_credentials");
      return;
    }

    const { getPortalSnapshot } = await import("@/lib/portal/backend");
    const snapshot = await getPortalSnapshot();
    const matchedUser = snapshot.users.find((entry) => entry.id === data.user?.id);
    redirect(getDefaultRoleHref(matchedUser?.role ?? "employee"));
    return;
  }

  const state = getPortalState();
  const user = state.users.find(
    (entry) => entry.email.toLowerCase() === email && entry.password === password,
  );

  if (!user) {
    redirect("/login?error=invalid_credentials");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  redirect(getDefaultRoleHref(user.role));
}

export async function logoutAction() {
  if (getPortalBackendMode() === "supabase") {
    await logoutFromSupabase();
    redirect("/login");
  }

  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function createCompanyAction(formData: FormData): Promise<CreateCompanyActionState> {
  try {
    const createdCompany = await createCompanyInBackend({
      name: String(formData.get("name") ?? "New Client"),
      clientCountry: String(formData.get("clientCountry") ?? "United States"),
      contactName: String(formData.get("contactName") ?? "New Contact"),
      contactEmail: String(formData.get("contactEmail") ?? "contact@example.com").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
    });

    touchPortalPaths();

    return {
      status: "success",
      message: `Employer login created for ${String(formData.get("name") ?? "New Client")}.`,
      credentials: {
        employerName: createdCompany.employerName,
        employerEmail: createdCompany.employerEmail,
        employerPassword: createdCompany.employerPassword,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the employer login.";
    return {
      status: "error",
      message,
    };
  }
}

export async function createAdminAction(formData: FormData) {
  await createAdminInBackend({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  touchPortalPaths();
}

export async function toggleCompanyStatusAction(companyId: string) {
  if (getPortalBackendMode() === "supabase") {
    await toggleCompanyStatusInBackend(companyId);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const company = state.companies.find((entry) => entry.id === companyId);
    if (!company) {
      return;
    }

    company.status = company.status === "active" ? "inactive" : "active";
  });

  touchPortalPaths();
}

export async function createHiringRequestAction(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const submittedByUserId = String(formData.get("submittedByUserId") ?? "");

  if (getPortalBackendMode() === "supabase") {
    await createHiringRequestInBackend({
      companyId,
      submittedByUserId,
      candidateName: String(formData.get("candidateName") ?? ""),
      candidateEmail: String(formData.get("candidateEmail") ?? ""),
      candidatePhone: String(formData.get("candidatePhone") ?? ""),
      designation: String(formData.get("designation") ?? ""),
      contractType: String(formData.get("contractType") ?? ""),
      workLocation: String(formData.get("workLocation") ?? ""),
      targetJoiningDate: optionalFormString(formData, "targetJoiningDate") ?? "",
      proposedSalary: Number(formData.get("proposedSalary") ?? 0),
      currency: "INR",
      leavePolicy: parseLeavePolicy(formData),
      notes: String(formData.get("notes") ?? ""),
    });

    touchPortalPaths();
    redirect("/employer/hiring");
    return;
  }

  mutatePortalState((state) => {
    state.hiringRequests.unshift({
      id: createId("hire"),
      companyId,
      submittedByUserId,
      candidateName: String(formData.get("candidateName") ?? ""),
      candidateEmail: String(formData.get("candidateEmail") ?? ""),
      candidatePhone: String(formData.get("candidatePhone") ?? ""),
      designation: String(formData.get("designation") ?? ""),
      contractType: String(formData.get("contractType") ?? ""),
      workLocation: String(formData.get("workLocation") ?? ""),
      targetJoiningDate: String(formData.get("targetJoiningDate") ?? ""),
      proposedSalary: Number(formData.get("proposedSalary") ?? 0),
      currency: "INR",
      leavePolicy: parseLeavePolicy(formData),
      status: "submitted",
      notes: String(formData.get("notes") ?? ""),
      submittedAt: nowIso(),
    });
  });

  touchPortalPaths();
  redirect("/employer/hiring");
}

export async function reviewHiringRequestAction(hiringRequestId: string, formData: FormData) {
  const decision = String(formData.get("decision") ?? "approved") as "approved" | "rejected";
  const leavePolicy = parseLeavePolicy(formData);

  if (getPortalBackendMode() === "supabase") {
    await reviewHiringRequestInBackend({
      hiringRequestId,
      decision,
      leavePolicy,
    });

    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const request = state.hiringRequests.find((entry) => entry.id === hiringRequestId);
    if (!request) {
      return;
    }

    request.reviewedAt = nowIso();
    request.leavePolicy = leavePolicy;

    if (decision === "rejected") {
      request.status = "rejected";
      return;
    }

    request.status = "onboarding_open";

    const employeeId = createId("employee");
    state.employees.unshift({
      id: employeeId,
      companyId: request.companyId,
      workEmail: request.candidateEmail,
      fullName: request.candidateName,
      phone: request.candidatePhone,
      designation: request.designation,
      contractType: request.contractType,
      workLocation: request.workLocation,
      country: "India",
      salary: request.proposedSalary,
      currency: request.currency,
      joiningDate: request.targetJoiningDate,
      status: "pending_onboarding",
      payrollReady: false,
      leavePolicy,
    });

    const onboardingId = createId("onboard");
    state.onboardingRequests.unshift({
      id: onboardingId,
      hiringRequestId: request.id,
      employeeId,
      companyId: request.companyId,
      token: `invite-${employeeId}`,
      status: "pending",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
      invitedAt: nowIso(),
    });

    state.leaveBalances.push(
      ...buildEmployeeLeaveBalances({
        employeeId,
        policy: leavePolicy,
      }),
    );

    state.lifecycleEvents.unshift({
      id: createId("life"),
      employeeId,
      type: "hiring_request",
      status: "approved",
      createdAt: nowIso(),
      detail: "Admin approved hiring request and opened onboarding.",
    });
  });

  touchPortalPaths();
}

export async function completeOnboardingAction(token: string, formData: FormData) {
  if (getPortalBackendMode() === "supabase") {
    await completeOnboardingInBackend({
      token,
      personalEmail: String(formData.get("personalEmail") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? "Employee@123"),
      bankName: String(formData.get("bankName") ?? ""),
      accountNumber: String(formData.get("accountNumber") ?? ""),
      ifscCode: String(formData.get("ifscCode") ?? ""),
      pan: String(formData.get("pan") ?? ""),
      aadhaarLast4: String(formData.get("aadhaarLast4") ?? ""),
      uan: String(formData.get("uan") ?? "") || undefined,
      esiNumber: String(formData.get("esiNumber") ?? "") || undefined,
      documents: ["PAN", "Aadhaar", "Bank Proof"].map((type) => ({
        type,
        fileName: String(
          formData.get(`doc_${type}`) ?? `${type.toLowerCase().replaceAll(" ", "-")}.pdf`,
        ),
      })),
    });

    touchPortalPaths();
    redirect("/login?onboarding=submitted");
    return;
  }

  mutatePortalState((state) => {
    const onboarding = state.onboardingRequests.find((entry) => entry.token === token);
    if (!onboarding) {
      return;
    }

    onboarding.status = "submitted";
    onboarding.completedAt = nowIso();

    const employee = state.employees.find((entry) => entry.id === onboarding.employeeId);
    if (!employee) {
      return;
    }

    const newUserId = createId("user");
    state.users.push({
      id: newUserId,
      email: employee.workEmail,
      password: String(formData.get("password") ?? "Employee@123"),
      name: employee.fullName,
      role: "employee",
      companyId: employee.companyId,
      employeeId: employee.id,
    });

    employee.userId = newUserId;
    employee.personalEmail = String(formData.get("personalEmail") ?? "");
    employee.phone = String(formData.get("phone") ?? employee.phone);
    employee.status = "pending_verification";

    state.bankDetails = state.bankDetails.filter((entry) => entry.employeeId !== employee.id);
    state.bankDetails.push({
      employeeId: employee.id,
      bankName: String(formData.get("bankName") ?? ""),
      accountNumber: String(formData.get("accountNumber") ?? ""),
      ifscCode: String(formData.get("ifscCode") ?? ""),
      pan: String(formData.get("pan") ?? ""),
      aadhaarLast4: String(formData.get("aadhaarLast4") ?? ""),
      uan: String(formData.get("uan") ?? ""),
      esiNumber: String(formData.get("esiNumber") ?? ""),
    });

    const uploadedDocs: EmployeeDocumentRecord[] = ["PAN", "Aadhaar", "Bank Proof"].map((type) => ({
      id: createId("doc"),
      employeeId: employee.id,
      type,
      fileName: String(formData.get(`doc_${type}`) ?? `${type.toLowerCase().replaceAll(" ", "-")}.pdf`),
      fileUrl: `/documents/${employee.id}/${type.toLowerCase()}`,
      status: "pending",
      uploadedAt: nowIso(),
    }));

    state.documents = state.documents.filter((entry) => entry.employeeId !== employee.id);
    state.documents.push(...uploadedDocs);

    state.lifecycleEvents.unshift({
      id: createId("life"),
      employeeId: employee.id,
      type: "onboarding",
      status: "submitted",
      createdAt: nowIso(),
      detail: "Employee completed onboarding details and uploaded documents.",
    });
  });

  touchPortalPaths();
  redirect("/login?onboarding=submitted");
}

export async function approveEmployeeAction(employeeId: string) {
  if (getPortalBackendMode() === "supabase") {
    await approveEmployeeInBackend(employeeId);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      return;
    }

    employee.status = "active";
    employee.payrollReady = true;

    const onboarding = state.onboardingRequests.find((entry) => entry.employeeId === employeeId);
    if (onboarding) {
      onboarding.status = "approved";
    }

    state.documents
      .filter((entry) => entry.employeeId === employeeId)
      .forEach((entry) => {
        entry.status = "approved";
      });

    state.lifecycleEvents.unshift({
      id: createId("life"),
      employeeId,
      type: "activation",
      status: "approved",
      createdAt: nowIso(),
      detail: "Admin verified documents and activated employee.",
    });
  });

  touchPortalPaths();
}

export async function uploadEmployeeDocumentAction(employeeId: string, formData: FormData) {
  if (getPortalBackendMode() === "supabase") {
    await uploadEmployeeDocumentInBackend({
      employeeId,
      type: String(formData.get("type") ?? "General"),
      fileName: String(formData.get("fileName") ?? "document.pdf"),
    });

    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    state.documents.unshift({
      id: createId("doc"),
      employeeId,
      type: String(formData.get("type") ?? "General"),
      fileName: String(formData.get("fileName") ?? "document.pdf"),
      fileUrl: `/documents/${employeeId}/${Date.now()}`,
      status: "pending",
      uploadedAt: nowIso(),
    });
  });

  touchPortalPaths();
}

export async function submitLeaveRequestAction(employeeId: string, formData: FormData) {
  if (getPortalBackendMode() === "supabase") {
    await submitLeaveRequestInBackend({
      employeeId,
      leaveType: String(formData.get("leaveType") ?? "casual") as "casual" | "sick" | "earned",
      requestedDays: Number(formData.get("requestedDays") ?? 1),
      reason: String(formData.get("reason") ?? ""),
      startDate: String(formData.get("startDate") ?? nowIso().slice(0, 10)),
      endDate: String(formData.get("endDate") ?? nowIso().slice(0, 10)),
    });

    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      return;
    }

    const leaveType = String(formData.get("leaveType") ?? "casual") as "casual" | "sick" | "earned";
    const requestedDays = Number(formData.get("requestedDays") ?? 1);
    const balances = state.leaveBalances.filter((entry) => entry.employeeId === employeeId);
    const evaluation = evaluateLeaveRequest({ balances, leaveType, requestedDays });

    state.leaveRequests.unshift({
      id: createId("leave"),
      employeeId,
      companyId: employee.companyId,
      leaveType,
      requestedDays,
      paidDays: evaluation.paidDays,
      lossOfPayDays: evaluation.lossOfPayDays,
      status: "pending",
      reason: String(formData.get("reason") ?? ""),
      startDate: String(formData.get("startDate") ?? nowIso().slice(0, 10)),
      endDate: String(formData.get("endDate") ?? nowIso().slice(0, 10)),
      submittedAt: nowIso(),
    });
  });

  touchPortalPaths();
}

export async function reviewLeaveRequestAction(leaveRequestId: string, decision: "approved" | "rejected") {
  if (getPortalBackendMode() === "supabase") {
    await reviewLeaveRequestInBackend(leaveRequestId, decision);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const request = state.leaveRequests.find((entry) => entry.id === leaveRequestId);
    if (!request) {
      return;
    }

    request.status = decision;
    request.reviewedAt = nowIso();

    if (decision === "approved") {
      const nextBalances = settleApprovedLeave({
        balances: state.leaveBalances.filter((entry) => entry.employeeId === request.employeeId),
        leaveType: request.leaveType,
        requestedDays: request.requestedDays,
      });

      state.leaveBalances = state.leaveBalances
        .filter((entry) => entry.employeeId !== request.employeeId)
        .concat(nextBalances);
    }
  });

  touchPortalPaths();
}

export async function runPayrollAction(formData: FormData) {
  const month = String(formData.get("month") ?? "2026-04");

  if (getPortalBackendMode() === "supabase") {
    await runPayrollInBackend(month);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const activeEmployees = state.employees.filter(
      (employee) => employee.status === "active" && employee.payrollReady,
    );

    activeEmployees.forEach((employee) => {
      const approvedLossOfPayDays = state.leaveRequests
        .filter(
          (entry) =>
            entry.employeeId === employee.id &&
            entry.status === "approved" &&
            entry.startDate.startsWith(month),
        )
        .reduce((sum, entry) => sum + entry.lossOfPayDays, 0);

      const payroll = calculatePayrollRecord({
        baseSalary: employee.salary,
        taxRate: 0.1,
        workingDaysInMonth: 30,
        approvedLossOfPayDays,
      });

      const payrollId = createId("pay");
      state.payrolls.unshift({
        id: payrollId,
        employeeId: employee.id,
        companyId: employee.companyId,
        month,
        baseSalary: payroll.baseSalary,
        tax: payroll.tax,
        lossOfPayDeduction: payroll.lossOfPayDeduction,
        netSalary: payroll.netSalary,
        status: "generated",
        createdAt: nowIso(),
      });

      state.payslips.unshift({
        id: createId("slip"),
        payrollId,
        employeeId: employee.id,
        month,
        fileName: `${employee.fullName.toLowerCase().replaceAll(" ", "-")}-${month}.pdf`,
        createdAt: nowIso(),
      });
    });
  });

  touchPortalPaths();
}

export async function submitResignationAction(employeeId: string, formData: FormData) {
  if (getPortalBackendMode() === "supabase") {
    await submitResignationInBackend({
      employeeId,
      reason: String(formData.get("reason") ?? ""),
      lastWorkingDate: String(formData.get("lastWorkingDate") ?? ""),
    });

    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const employee = state.employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      return;
    }

    state.resignations.unshift({
      id: createId("resign"),
      employeeId,
      companyId: employee.companyId,
      reason: String(formData.get("reason") ?? ""),
      status: "pending",
      submittedAt: nowIso(),
      lastWorkingDate: String(formData.get("lastWorkingDate") ?? ""),
    });
  });

  touchPortalPaths();
}

export async function reviewResignationAction(resignationId: string, decision: "approved" | "rejected") {
  if (getPortalBackendMode() === "supabase") {
    await reviewResignationInBackend(resignationId, decision);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const resignation = state.resignations.find((entry) => entry.id === resignationId);
    if (!resignation) {
      return;
    }

    resignation.status = decision;

    if (decision === "approved") {
      const employee = state.employees.find((entry) => entry.id === resignation.employeeId);
      if (employee) {
        employee.status = "offboarding";
      }

      state.offboardingCases.unshift({
        id: createId("off"),
        employeeId: resignation.employeeId,
        companyId: resignation.companyId,
        status: "pending",
        checklistSummary: "Exit docs, F&F settlement, access revocation",
        finalSettlementStatus: "pending",
        createdAt: nowIso(),
      });
    }
  });

  touchPortalPaths();
}

export async function updateOffboardingStatusAction(offboardingId: string, status: "in_progress" | "completed") {
  if (getPortalBackendMode() === "supabase") {
    await updateOffboardingStatusInBackend(offboardingId, status);
    touchPortalPaths();
    return;
  }

  mutatePortalState((state) => {
    const offboarding = state.offboardingCases.find((entry) => entry.id === offboardingId);
    if (!offboarding) {
      return;
    }

    offboarding.status = status;
    offboarding.finalSettlementStatus = status === "completed" ? "completed" : "ready";

    if (status === "completed") {
      const employee = state.employees.find((entry) => entry.id === offboarding.employeeId);
      if (employee) {
        employee.status = "inactive";
        employee.payrollReady = false;
      }
    }
  });

  touchPortalPaths();
}
