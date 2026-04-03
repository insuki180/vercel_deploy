import { describe, expect, it } from "vitest";
import { createPortalId } from "@/lib/portal/ids";

describe("createPortalId", () => {
  it("returns a UUID suitable for Supabase primary keys", () => {
    const id = createPortalId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
