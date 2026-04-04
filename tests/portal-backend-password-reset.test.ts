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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/portal/demo-store", () => ({
  getPortalState: vi.fn(() => mockState),
  mutatePortalState,
}));

vi.mock("@/lib/supabase/env", () => ({
  getPortalBackendMode,
  hasSupabaseServiceRole,
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
});
