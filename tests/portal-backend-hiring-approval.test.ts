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

vi.mock("server-only", () => ({}));

vi.mock("@/lib/portal/demo-store", () => ({
  getPortalState: vi.fn(() => mockState),
  mutatePortalState,
}));

vi.mock("@/lib/supabase/env", () => ({
  getPortalBackendMode,
  hasSupabaseServiceRole,
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

    expect(result).toEqual({
      employeeId: "employee_123",
      employeeName: "Asha Rao",
      employeeEmail: "asha@example.com",
      employeePassword: expect.any(String),
    });
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
});
