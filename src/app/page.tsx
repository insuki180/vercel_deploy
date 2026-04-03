import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/portal/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(user.role === "admin" ? "/admin" : user.role === "employer" ? "/employer" : "/employee");
}
