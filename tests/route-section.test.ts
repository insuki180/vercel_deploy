import { describe, expect, it } from "vitest";
import { roleSectionGroups } from "@/components/portal/route-section";

describe("admin navigation", () => {
  it("exposes a single employer management section instead of separate companies and employers", () => {
    const adminItems = roleSectionGroups.admin.flatMap((group) => group.items);
    const labels = adminItems.map((item) => item.label);
    const keys = adminItems.map((item) => item.key);

    expect(labels).toContain("Employers");
    expect(keys).toContain("employers");
    expect(labels).not.toContain("Companies");
    expect(keys).not.toContain("companies");
  });
});
