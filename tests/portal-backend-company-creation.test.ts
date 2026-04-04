import { beforeEach, describe, expect, it, vi } from "vitest";

type MinimalPortalState = {
  users: Array<Record<string, unknown>>;
  companies: Array<Record<string, unknown>>;
  employers: Array<Record<string, unknown>>;
};

const mutatePortalState = vi.fn((updater: (state: MinimalPortalState) => void) => {
  updater(mockState);
});

const mockState: MinimalPortalState = {
  users: [],
  companies: [],
  employers: [],
};

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
    .mockReturnValueOnce("company_123")
    .mockReturnValueOnce("user_123")
    .mockReturnValueOnce("employer_123"),
}));

describe("createCompanyInBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockState.users = [];
    mockState.companies = [];
    mockState.employers = [];
    getPortalBackendMode.mockReturnValue("demo");
    hasSupabaseServiceRole.mockReturnValue(false);
  });

  it("creates a company plus employer login and generates a temporary password when missing", async () => {
    const { createCompanyInBackend } = await import("@/lib/portal/backend");

    const result = await createCompanyInBackend({
      name: "Northstar Labs",
      clientCountry: "United Kingdom",
      contactName: "Riya Mehta",
      contactEmail: "riya@northstarlabs.com",
      password: "",
    });

    expect(result.companyId).toBe("company_123");
    expect(result.employerUserId).toBe("user_123");
    expect(result.employerEmail).toBe("riya@northstarlabs.com");
    expect(result.employerPassword).toMatch(/[A-Z]/);
    expect(result.employerPassword).toMatch(/[a-z]/);
    expect(result.employerPassword).toMatch(/[0-9]/);

    expect(mockState.companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "company_123",
          name: "Northstar Labs",
          primaryContactEmail: "riya@northstarlabs.com",
        }),
      ]),
    );
    expect(mockState.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "user_123",
          email: "riya@northstarlabs.com",
          role: "employer",
          companyId: "company_123",
        }),
      ]),
    );
    expect(mockState.employers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "employer_123",
          companyId: "company_123",
          userId: "user_123",
          name: "Riya Mehta",
        }),
      ]),
    );
  });
});
