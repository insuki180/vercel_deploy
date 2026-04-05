import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn();
const cookies = vi.fn(async () => ({
  set: vi.fn(),
  delete: vi.fn(),
}));

const backendMocks = {
  createAdminInBackend: vi.fn(),
  createCompanyInBackend: vi.fn(),
  toggleCompanyStatusInBackend: vi.fn(),
  createHiringRequestInBackend: vi.fn(),
  reviewHiringRequestInBackend: vi.fn(),
  resetPortalUserPasswordInBackend: vi.fn(),
  changeOwnPasswordInBackend: vi.fn(),
  completeOnboardingInBackend: vi.fn(),
  approveEmployeeInBackend: vi.fn(),
  uploadEmployeeDocumentInBackend: vi.fn(),
  submitLeaveRequestInBackend: vi.fn(),
  reviewLeaveRequestInBackend: vi.fn(),
  runPayrollInBackend: vi.fn(),
  submitResignationInBackend: vi.fn(),
  reviewResignationInBackend: vi.fn(),
  updateOffboardingStatusInBackend: vi.fn(),
  getPortalSnapshot: vi.fn(),
  loginWithSupabase: vi.fn(),
  logoutFromSupabase: vi.fn(),
};

const mutatePortalState = vi.fn();
const getPortalBackendMode = vi.fn(() => "supabase");

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("next/headers", () => ({
  cookies,
}));

vi.mock("@/lib/portal/backend", () => backendMocks);

vi.mock("@/lib/portal/demo-store", () => ({
  getPortalState: vi.fn(),
  mutatePortalState,
}));

vi.mock("@/lib/supabase/env", () => ({
  getPortalBackendMode,
}));

describe("portal actions in Supabase mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPortalBackendMode.mockReturnValue("supabase");
  });

  it("delegates company status toggles to the backend adapter", async () => {
    const { toggleCompanyStatusAction } = await import("@/lib/portal/actions");

    await toggleCompanyStatusAction("company_1");

    expect(backendMocks.toggleCompanyStatusInBackend).toHaveBeenCalledWith("company_1");
    expect(mutatePortalState).not.toHaveBeenCalled();
  });

  it("redirects by the signed-in Supabase user id instead of profile email", async () => {
    const { loginAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("email", "admin@eor.com");
    formData.set("password", "Admin@123");

    backendMocks.loginWithSupabase.mockResolvedValue({
      error: null,
      data: { user: { id: "admin_user_id", email: "admin@eor.com" } },
    });
    backendMocks.getPortalSnapshot.mockResolvedValue({
      users: [
        {
          id: "admin_user_id",
          email: "",
          password: "",
          name: "Admin User",
          role: "admin",
        },
      ],
    });

    await loginAction(formData);

    expect(redirect).toHaveBeenCalledWith("/admin/overview");
  });

  it("redirects pending onboarding employees into the onboarding workspace", async () => {
    const { loginAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("email", "pending.employee@globex.com");
    formData.set("password", "Pending@123");

    backendMocks.loginWithSupabase.mockResolvedValue({
      error: null,
      data: { user: { id: "employee_user_id", email: "pending.employee@globex.com" } },
    });
    backendMocks.getPortalSnapshot.mockResolvedValue({
      users: [
        {
          id: "employee_user_id",
          email: "",
          password: "",
          name: "Pending Employee",
          role: "employee",
          employeeId: "employee_1",
        },
      ],
      employees: [
        {
          id: "employee_1",
          status: "pending_onboarding",
        },
      ],
    });

    await loginAction(formData);

    expect(redirect).toHaveBeenCalledWith("/employee/onboarding");
  });

  it("redirects users with temporary credentials to settings before their normal workspace", async () => {
    const { loginAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("email", "pending.employee@globex.com");
    formData.set("password", "Pending@123");

    backendMocks.loginWithSupabase.mockResolvedValue({
      error: null,
      data: { user: { id: "employee_user_id", email: "pending.employee@globex.com" } },
    });
    backendMocks.getPortalSnapshot.mockResolvedValue({
      users: [
        {
          id: "employee_user_id",
          email: "",
          password: "",
          name: "Pending Employee",
          role: "employee",
          employeeId: "employee_1",
          mustChangePassword: true,
        },
      ],
      employees: [
        {
          id: "employee_1",
          status: "pending_onboarding",
        },
      ],
    });

    await loginAction(formData);

    expect(redirect).toHaveBeenCalledWith("/employee/settings");
  });

  it("delegates admin creation to the backend adapter", async () => {
    const { createAdminAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("fullName", "Kiran Admin");
    formData.set("email", "kiran@example.com");
    formData.set("password", "Kiran@123");

    await createAdminAction(formData);

    expect(backendMocks.createAdminInBackend).toHaveBeenCalledWith({
      fullName: "Kiran Admin",
      email: "kiran@example.com",
      password: "Kiran@123",
    });
  });

  it("returns created employer credentials when a company is created", async () => {
    const { createCompanyAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("name", "Northstar Labs");
    formData.set("clientCountry", "United Kingdom");
    formData.set("contactName", "Riya Mehta");
    formData.set("contactEmail", "riya@northstarlabs.com");
    formData.set("password", "");

    backendMocks.createCompanyInBackend.mockResolvedValue({
      companyId: "company_123",
      employerUserId: "user_123",
      employerName: "Riya Mehta",
      employerEmail: "riya@northstarlabs.com",
      employerPassword: "Temp@12345",
    });

    const result = await createCompanyAction(formData);

    expect(backendMocks.createCompanyInBackend).toHaveBeenCalledWith({
      name: "Northstar Labs",
      clientCountry: "United Kingdom",
      contactName: "Riya Mehta",
      contactEmail: "riya@northstarlabs.com",
      password: "",
    });
    expect(result).toEqual({
      status: "success",
      message: "Employer login created for Northstar Labs.",
      credentials: {
        employerName: "Riya Mehta",
        employerEmail: "riya@northstarlabs.com",
        employerPassword: "Temp@12345",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/employers");
    expect(revalidatePath).not.toHaveBeenCalledWith("/employer");
    expect(revalidatePath).not.toHaveBeenCalledWith("/employee");
  });

  it("delegates hiring request creation to the backend adapter", async () => {
    const { createHiringRequestAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("companyId", "company_1");
    formData.set("submittedByUserId", "user_1");
    formData.set("candidateName", "Asha Rao");
    formData.set("candidateEmail", "asha@example.com");
    formData.set("candidatePhone", "9999999999");
    formData.set("designation", "Designer");
    formData.set("contractType", "full_time");
    formData.set("workLocation", "Bengaluru");
    formData.set("targetJoiningDate", "2026-04-30");
    formData.set("proposedSalary", "90000");
    formData.set("leaveCasual", "6");
    formData.set("leaveSick", "8");
    formData.set("leaveEarned", "12");
    formData.set("notes", "Priority hire");

    await createHiringRequestAction(formData);

    expect(backendMocks.createHiringRequestInBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company_1",
        submittedByUserId: "user_1",
        candidateName: "Asha Rao",
        proposedSalary: 90000,
        leavePolicy: { casual: 6, sick: 8, earned: 12 },
      }),
    );
    expect(mutatePortalState).not.toHaveBeenCalled();
  });

  it("delegates hiring review to the backend adapter", async () => {
    const { reviewHiringRequestAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("decision", "approved");
    formData.set("leaveCasual", "7");
    formData.set("leaveSick", "9");
    formData.set("leaveEarned", "14");

    await reviewHiringRequestAction("hire_1", formData);

    expect(backendMocks.reviewHiringRequestInBackend).toHaveBeenCalledWith({
      hiringRequestId: "hire_1",
      decision: "approved",
      leavePolicy: { casual: 7, sick: 9, earned: 14 },
    });
  });

  it("returns employee credentials when hiring is approved", async () => {
    const { reviewHiringRequestFormAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("decision", "approved");
    formData.set("leaveCasual", "7");
    formData.set("leaveSick", "9");
    formData.set("leaveEarned", "14");

    backendMocks.reviewHiringRequestInBackend.mockResolvedValue({
      employeeId: "employee_1",
      employeeName: "Asha Rao",
      employeeEmail: "asha@example.com",
      employeePassword: "Temp@12345",
    });

    formData.set("hiringRequestId", "hire_1");

    const result = await reviewHiringRequestFormAction({ status: "idle" }, formData);

    expect(result).toEqual({
      status: "success",
      message: "Employee login created for Asha Rao.",
      credentials: {
        employeeName: "Asha Rao",
        employeeEmail: "asha@example.com",
        employeePassword: "Temp@12345",
      },
    });
  });

  it("returns temporary credentials when an admin resets a user password", async () => {
    const { resetUserPasswordAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("targetRole", "employee");
    formData.set("targetId", "employee_1");

    backendMocks.resetPortalUserPasswordInBackend.mockResolvedValue({
      accountRole: "employee",
      accountName: "Asha Rao",
      accountEmail: "asha@example.com",
      temporaryPassword: "NewTemp@123",
    });

    const result = await resetUserPasswordAction({ status: "idle" }, formData);

    expect(backendMocks.resetPortalUserPasswordInBackend).toHaveBeenCalledWith({
      targetRole: "employee",
      targetId: "employee_1",
    });
    expect(result).toEqual({
      status: "success",
      message: "Temporary password reset for Asha Rao.",
      credentials: {
        accountRole: "employee",
        accountName: "Asha Rao",
        accountEmail: "asha@example.com",
        temporaryPassword: "NewTemp@123",
      },
    });
  });

  it("delegates self-service password changes and returns a success state", async () => {
    const { changeOwnPasswordAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("currentPassword", "Temp@12345");
    formData.set("newPassword", "Fresh@12345");
    formData.set("confirmPassword", "Fresh@12345");

    backendMocks.changeOwnPasswordInBackend.mockResolvedValue(undefined);

    const result = await changeOwnPasswordAction({ status: "idle" }, formData);

    expect(backendMocks.changeOwnPasswordInBackend).toHaveBeenCalledWith({
      currentPassword: "Temp@12345",
      newPassword: "Fresh@12345",
    });
    expect(result).toEqual({
      status: "success",
      message: "Your password has been updated.",
    });
  });

  it("delegates onboarding completion to the backend adapter", async () => {
    const { completeOnboardingAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("personalEmail", "asha.personal@example.com");
    formData.set("phone", "8888888888");
    formData.set("bankName", "HDFC");
    formData.set("accountNumber", "123456789");
    formData.set("ifscCode", "HDFC0001");
    formData.set("pan", "ABCDE1234F");
    formData.set("aadhaarLast4", "1234");
    formData.set("uan", "uan-1");
    formData.set("esiNumber", "esi-1");
    formData.set("doc_PAN", "pan.pdf");
    formData.set("doc_Aadhaar", "aadhaar.pdf");
    formData.set("doc_Bank Proof", "bank-proof.pdf");

    await completeOnboardingAction("employee_1", formData);

    expect(backendMocks.completeOnboardingInBackend).toHaveBeenCalledWith({
      employeeId: "employee_1",
      personalEmail: "asha.personal@example.com",
      phone: "8888888888",
      bankName: "HDFC",
      accountNumber: "123456789",
      ifscCode: "HDFC0001",
      pan: "ABCDE1234F",
      aadhaarLast4: "1234",
      uan: "uan-1",
      esiNumber: "esi-1",
      documents: [
        { type: "PAN", fileName: "pan.pdf" },
        { type: "Aadhaar", fileName: "aadhaar.pdf" },
        { type: "Bank Proof", fileName: "bank-proof.pdf" },
      ],
    });
    expect(redirect).toHaveBeenCalledWith("/employee/onboarding?submitted=1");
  });

  it("delegates employee approval and document upload to backend adapters", async () => {
    const { approveEmployeeAction, uploadEmployeeDocumentAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("type", "Address Proof");
    formData.set("fileName", "address.pdf");

    await approveEmployeeAction("employee_1");
    await uploadEmployeeDocumentAction("employee_1", formData);

    expect(backendMocks.approveEmployeeInBackend).toHaveBeenCalledWith("employee_1");
    expect(backendMocks.uploadEmployeeDocumentInBackend).toHaveBeenCalledWith({
      employeeId: "employee_1",
      type: "Address Proof",
      fileName: "address.pdf",
    });
  });

  it("delegates leave submission and review to backend adapters", async () => {
    const { submitLeaveRequestAction, reviewLeaveRequestAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("leaveType", "casual");
    formData.set("requestedDays", "3");
    formData.set("reason", "Family event");
    formData.set("startDate", "2026-04-10");
    formData.set("endDate", "2026-04-12");

    await submitLeaveRequestAction("employee_1", formData);
    await reviewLeaveRequestAction("leave_1", "approved");

    expect(backendMocks.submitLeaveRequestInBackend).toHaveBeenCalledWith({
      employeeId: "employee_1",
      leaveType: "casual",
      requestedDays: 3,
      reason: "Family event",
      startDate: "2026-04-10",
      endDate: "2026-04-12",
    });
    expect(backendMocks.reviewLeaveRequestInBackend).toHaveBeenCalledWith("leave_1", "approved");
  });

  it("delegates payroll runs to the backend adapter", async () => {
    const { runPayrollAction } = await import("@/lib/portal/actions");
    const formData = new FormData();
    formData.set("month", "2026-04");

    await runPayrollAction(formData);

    expect(backendMocks.runPayrollInBackend).toHaveBeenCalledWith("2026-04");
  });

  it("delegates resignation and offboarding workflow actions to backend adapters", async () => {
    const { submitResignationAction, reviewResignationAction, updateOffboardingStatusAction } = await import(
      "@/lib/portal/actions"
    );
    const formData = new FormData();
    formData.set("reason", "Personal move");
    formData.set("lastWorkingDate", "2026-05-15");

    await submitResignationAction("employee_1", formData);
    await reviewResignationAction("resignation_1", "approved");
    await updateOffboardingStatusAction("offboarding_1", "completed");

    expect(backendMocks.submitResignationInBackend).toHaveBeenCalledWith({
      employeeId: "employee_1",
      reason: "Personal move",
      lastWorkingDate: "2026-05-15",
    });
    expect(backendMocks.reviewResignationInBackend).toHaveBeenCalledWith("resignation_1", "approved");
    expect(backendMocks.updateOffboardingStatusInBackend).toHaveBeenCalledWith("offboarding_1", "completed");
  });
});
