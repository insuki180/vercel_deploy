import { redirect } from "next/navigation";
import { getScopedSelectors } from "@/lib/portal/selectors";
import { requireRole } from "@/lib/portal/session";

export default async function EmployeeIndexPage() {
  const user = await requireRole("employee");
  const scoped = await getScopedSelectors(user);

  if (scoped.employee?.status === "pending_onboarding") {
    redirect("/employee/onboarding");
  }

  redirect("/employee/overview");
}
