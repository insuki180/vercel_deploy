import { beforeEach, describe, expect, it, vi } from "vitest";

type MinimalPortalState = {
  users: Array<Record<string, unknown>>;
};

const mockState: MinimalPortalState = {
  users: [],
};

const mutatePortalState = vi.fn((updater: (state: MinimalPortalState) => void) => {
  updater(mockState);
});

const getPortalBackendMode = vi.fn(() => "demo");
const hasSupabaseServiceRole = vi.fn(() => false);
const createSupabaseAdminClient = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/portal/demo-store", () => ({
  getPortalState: vi.fn(() => mockState),
  mutatePortalState,
}));

vi.mock("@/lib/supabase/env", () => ({
  getPortalBackendMode,
  hasSupabaseServiceRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient,
  createSupabaseServerClient,
}));

describe("resetPortalUserPasswordInBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockState.users = [
      {
        id: "admin_1",
        email: "admin@eor.com",
        password: "Admin@123",
        name: "Aarav Admin",
        role: "admin",
      },
      {
        id: "employer_user_1",
        email: "employer@globex.com",
        password: "Employer@123",
        name: "Mina Employer",
        role: "employer",
        companyId: "company_1",
      },
      {
        id: "employee_user_1",
        email: "employee@globex.com",
        password: "Employee@123",
        name: "Priya Sharma",
        role: "employee",
        companyId: "company_1",
        employeeId: "employee_1",
      },
    ];
    getPortalBackendMode.mockReturnValue("demo");
    hasSupabaseServiceRole.mockReturnValue(false);
  });

  it("resets an admin password in demo mode", async () => {
    const { resetPortalUserPasswordInBackend } = await import("@/lib/portal/backend");

    const result = await resetPortalUserPasswordInBackend({
      targetRole: "admin",
      targetId: "admin_1",
    });

    expect(result).toEqual({
      accountRole: "admin",
      accountName: "Aarav Admin",
      accountEmail: "admin@eor.com",
      temporaryPassword: expect.any(String),
    });
    expect(mockState.users.find((entry) => entry.id === "admin_1")?.password).toBe(
      result.temporaryPassword,
    );
  });

  it("resets an employer password in demo mode", async () => {
    const { resetPortalUserPasswordInBackend } = await import("@/lib/portal/backend");

    const result = await resetPortalUserPasswordInBackend({
      targetRole: "employer",
      targetId: "company_1",
    });

    expect(result.accountRole).toBe("employer");
    expect(result.accountEmail).toBe("employer@globex.com");
    expect(mockState.users.find((entry) => entry.id === "employer_user_1")?.password).toBe(
      result.temporaryPassword,
    );
  });

  it("resets an employee password in demo mode", async () => {
    const { resetPortalUserPasswordInBackend } = await import("@/lib/portal/backend");

    const result = await resetPortalUserPasswordInBackend({
      targetRole: "employee",
      targetId: "employee_1",
    });

    expect(result.accountRole).toBe("employee");
    expect(result.accountEmail).toBe("employee@globex.com");
    expect(mockState.users.find((entry) => entry.id === "employee_user_1")?.password).toBe(
      result.temporaryPassword,
    );
  });

  it("provisions a missing employee auth account before resetting the password in supabase mode", async () => {
    getPortalBackendMode.mockReturnValue("supabase");
    hasSupabaseServiceRole.mockReturnValue(true);

    const updateEmployeeEq = vi.fn().mockResolvedValue({ error: null });
    const updateEmployee = vi.fn(() => ({ eq: updateEmployeeEq }));
    const employeeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "employee_legacy",
        user_id: null,
        full_name: "Legacy Employee",
        work_email: "legacy.employee@example.com",
        company_id: "company_legacy",
      },
      error: null,
    });
    const employeeEq = vi.fn(() => ({ single: employeeSingle }));
    const employeeSelect = vi.fn(() => ({ eq: employeeEq }));
    const employeeTable = {
      select: employeeSelect,
      update: updateEmployee,
    };

    const profileEq = vi.fn().mockResolvedValue({ error: null });
    const profileUpdate = vi.fn(() => ({ eq: profileEq }));
    const profileUpsert = vi.fn().mockResolvedValue({ error: null });
    const profilesTable = {
      update: profileUpdate,
      upsert: profileUpsert,
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "employees") return employeeTable;
        if (table === "profiles") return profilesTable;
        throw new Error(`Unexpected table ${table}`);
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
          createUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "auth_employee_1",
                email: "legacy.employee@example.com",
              },
            },
            error: null,
          }),
          getUserById: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: "auth_employee_1",
                email: "legacy.employee@example.com",
              },
            },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    createSupabaseAdminClient.mockReturnValue(mockSupabase);

    const { resetPortalUserPasswordInBackend } = await import("@/lib/portal/backend");

    const result = await resetPortalUserPasswordInBackend({
      targetRole: "employee",
      targetId: "employee_legacy",
    });

    expect(profileUpsert).toHaveBeenCalledWith({
      id: "auth_employee_1",
      role: "employee",
      full_name: "Legacy Employee",
      company_id: "company_legacy",
      employee_id: "employee_legacy",
      must_change_password: true,
    });
    expect(profileUpdate).toHaveBeenCalledWith({ must_change_password: true });
    expect(profileEq).toHaveBeenCalledWith("id", "auth_employee_1");
    expect(updateEmployee).toHaveBeenCalledWith({ user_id: "auth_employee_1" });
    expect(updateEmployeeEq).toHaveBeenCalledWith("id", "employee_legacy");
    expect(mockSupabase.auth.admin.updateUserById).toHaveBeenCalledWith("auth_employee_1", {
      password: result.temporaryPassword,
    });
    expect(result).toEqual({
      accountRole: "employee",
      accountName: "Legacy Employee",
      accountEmail: "legacy.employee@example.com",
      temporaryPassword: expect.any(String),
    });
  });
});
