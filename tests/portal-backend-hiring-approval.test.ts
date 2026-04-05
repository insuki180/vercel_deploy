import { beforeEach, describe, expect, it, vi } from "vitest";

type MinimalPortalState = {
  users: Array<Record<string, unknown>>;
  employees: Array<Record<string, unknown>>;
  hiringRequests: Array<Record<string, unknown>>;
  onboardingRequests: Array<Record<string, unknown>>;
  leaveBalances: Array<Record<string, unknown>>;
  lifecycleEvents: Array<Record<string, unknown>>;
};

const mockState: MinimalPortalState = {
  users: [],
  employees: [],
  hiringRequests: [],
  onboardingRequests: [],
  leaveBalances: [],
  lifecycleEvents: [],
};

const mutatePortalState = vi.fn((updater: (state: MinimalPortalState) => void) => {
  updater(mockState);
});

const getPortalBackendMode = vi.fn(() => "demo");
const hasSupabaseServiceRole = vi.fn(() => false);
const createSupabaseAdminClient = vi.fn();

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
}));

vi.mock("@/lib/portal/ids", () => ({
  createPortalId: vi
    .fn()
    .mockReturnValueOnce("employee_123")
    .mockReturnValueOnce("user_123")
    .mockReturnValueOnce("onboard_123")
    .mockReturnValueOnce("life_123"),
}));

describe("reviewHiringRequestInBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockState.users = [];
    mockState.employees = [];
    mockState.hiringRequests = [
      {
        id: "hire_123",
        companyId: "company_123",
        submittedByUserId: "employer_123",
        candidateName: "Asha Rao",
        candidateEmail: "asha@example.com",
        candidatePhone: "+91 9999999999",
        designation: "Designer",
        contractType: "full_time",
        workLocation: "Remote",
        targetJoiningDate: "2026-04-30",
        proposedSalary: 90000,
        currency: "INR",
        leavePolicy: { casual: 6, sick: 8, earned: 12 },
        status: "submitted",
        notes: "",
        submittedAt: "2026-04-04T00:00:00.000Z",
      },
    ];
    mockState.onboardingRequests = [];
    mockState.leaveBalances = [];
    mockState.lifecycleEvents = [];
    getPortalBackendMode.mockReturnValue("demo");
    hasSupabaseServiceRole.mockReturnValue(false);
  });

  it("creates employee login credentials during hiring approval", async () => {
    const { reviewHiringRequestInBackend } = await import("@/lib/portal/backend");

    const result = await reviewHiringRequestInBackend({
      hiringRequestId: "hire_123",
      decision: "approved",
      leavePolicy: { casual: 7, sick: 9, earned: 14 },
    });

    expect(result?.employeeName).toBe("Asha Rao");
    expect(result?.employeeEmail).toBe("asha@example.com");
    expect(result?.employeePassword).toEqual(expect.any(String));
    expect(mockState.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "user_123",
          role: "employee",
          email: "asha@example.com",
          employeeId: "employee_123",
          companyId: "company_123",
        }),
      ]),
    );
    expect(mockState.employees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "employee_123",
          userId: "user_123",
          status: "pending_onboarding",
          workEmail: "asha@example.com",
        }),
      ]),
    );
  });

  it("creates the employee profile before inserting the employee row in supabase mode", async () => {
    getPortalBackendMode.mockReturnValue("supabase");
    hasSupabaseServiceRole.mockReturnValue(true);

    const callOrder: string[] = [];
    const requestSingle = vi.fn().mockResolvedValue({
      data: {
        id: "hire_123",
        company_id: "company_123",
        candidate_name: "Asha Rao",
        candidate_email: "asha@example.com",
        candidate_phone: "+91 9999999999",
        designation: "Designer",
        contract_type: "full_time",
        work_location: "Remote",
        proposed_salary: 90000,
        currency: "INR",
        target_joining_date: "2026-04-30",
      },
    });
    const requestEq = vi.fn(() => ({ single: requestSingle }));
    const requestSelect = vi.fn(() => ({ eq: requestEq }));
    const requestUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const requestUpdate = vi.fn(() => ({
      eq: requestUpdateEq,
    }));

    const employeeInsert = vi.fn(async () => {
      callOrder.push("employees.insert");
      return { error: null };
    });

    const profileUpsert = vi.fn(async (payload) => {
      callOrder.push(`profiles.upsert:${payload.employee_id ? "with-employee" : "without-employee"}`);
      return { error: null };
    });

    const onboardingInsert = vi.fn().mockResolvedValue({ error: null });
    const leavePolicyInsert = vi.fn().mockResolvedValue({ error: null });
    const leaveBalancesInsert = vi.fn().mockResolvedValue({ error: null });
    const lifecycleInsert = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "hiring_requests") {
          return {
            select: requestSelect,
            update: requestUpdate,
          };
        }
        if (table === "profiles") {
          return { upsert: profileUpsert };
        }
        if (table === "employees") {
          return { insert: employeeInsert };
        }
        if (table === "employee_onboarding_requests") {
          return { insert: onboardingInsert };
        }
        if (table === "leave_policies") {
          return { insert: leavePolicyInsert };
        }
        if (table === "employee_leave_balances") {
          return { insert: leaveBalancesInsert };
        }
        if (table === "employee_lifecycle_events") {
          return { insert: lifecycleInsert };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "auth_employee_1", email: "asha@example.com" } },
            error: null,
          }),
        },
      },
    };

    createSupabaseAdminClient.mockReturnValue(mockSupabase);

    const { reviewHiringRequestInBackend } = await import("@/lib/portal/backend");

    const result = await reviewHiringRequestInBackend({
      hiringRequestId: "hire_123",
      decision: "approved",
      leavePolicy: { casual: 7, sick: 9, earned: 14 },
    });

    expect(result?.employeeName).toBe("Asha Rao");
    expect(result?.employeeEmail).toBe("asha@example.com");
    expect(result?.employeePassword).toEqual(expect.any(String));
    expect(callOrder[0]).toBe("profiles.upsert:without-employee");
    expect(callOrder[1]).toBe("employees.insert");
    expect(profileUpsert).toHaveBeenCalledTimes(2);
    expect(requestUpdate).toHaveBeenCalledTimes(1);
    expect(requestUpdateEq).toHaveBeenCalledWith("id", "hire_123");
  });
});
