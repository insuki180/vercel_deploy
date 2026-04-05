import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal/session";

export default async function EmployerIndexPage() {
  const user = await requireRole("employer");
  if (user.mustChangePassword) {
    redirect("/employer/settings");
  }
  redirect("/employer/overview");
}
