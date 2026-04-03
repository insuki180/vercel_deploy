import { describe, expect, it } from "vitest";
import {
  getPortalBackendModeFromEnv,
  hasSupabaseAuthConfig,
  hasSupabaseServiceRole,
} from "@/lib/supabase/env";

describe("supabase env selection", () => {
  it("uses demo mode when Supabase auth env is incomplete", () => {
    expect(
      getPortalBackendModeFromEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      }),
    ).toBe("demo");
  });

  it("uses supabase mode when browser auth env is present", () => {
    expect(
      getPortalBackendModeFromEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "",
      }),
    ).toBe("supabase");
  });

  it("reports service role availability independently", () => {
    expect(
      hasSupabaseAuthConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toBe(true);
    expect(hasSupabaseServiceRole({ SUPABASE_SERVICE_ROLE_KEY: "service-role" })).toBe(true);
  });
});
