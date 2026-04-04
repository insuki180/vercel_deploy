import { redirect } from "next/navigation";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/login?error=use_employee_login&token=${token}`);
}
