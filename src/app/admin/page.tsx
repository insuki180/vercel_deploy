import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal/session";

export default async function AdminIndexPage() {
  const user = await requireRole("admin");
  if (user.mustChangePassword) {
    redirect("/admin/settings");
  }
  redirect("/admin/overview");
}
