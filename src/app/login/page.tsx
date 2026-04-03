import { ShieldCheck } from "lucide-react";
import { loginAction } from "@/lib/portal/actions";

const demoAccounts = [
  { role: "Admin", email: "admin@eor.com", password: "Admin@123" },
  { role: "Employer", email: "employer@globex.com", password: "Employer@123" },
  { role: "Employee", email: "employee@globex.com", password: "Employee@123" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = params.error === "invalid_credentials";
  const onboardingSubmitted = params.onboarding === "submitted";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20">
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-sky-200">
              <ShieldCheck size={16} />
              India-focused EOR operations
            </div>
            <h1 className="text-4xl font-semibold tracking-tight">Sign in to the EOR control portal</h1>
            <p className="text-base leading-7 text-slate-300">
              This build includes admin, employer, and employee workspaces with hiring, onboarding, leave, payroll, payslips, and offboarding flows.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {demoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left"
                >
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{account.role}</p>
                  <p className="mt-2 text-sm font-medium text-white">{account.email}</p>
                  <p className="mt-2 text-xs text-slate-300">{account.password}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <form className="space-y-5" action={loginAction}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">Account Access</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
            </div>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Email</span>
              <input
                name="email"
                defaultValue="admin@eor.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="name@company.com"
              />
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Password</span>
              <input
                type="password"
                name="password"
                defaultValue="Admin@123"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Invalid credentials. Use one of the seeded demo accounts shown on the left.
              </div>
            ) : null}

            {onboardingSubmitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Onboarding submitted. An admin can now verify the employee and you can sign in with the new credentials afterward.
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
