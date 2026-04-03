import Link from "next/link";
import { notFound } from "next/navigation";
import { completeOnboardingAction } from "@/lib/portal/actions";
import { getPortalState } from "@/lib/portal/demo-store";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const state = getPortalState();
  const onboarding = state.onboardingRequests.find((entry) => entry.token === token);

  if (!onboarding) {
    notFound();
  }

  const employee = state.employees.find((entry) => entry.id === onboarding.employeeId);

  if (!employee) {
    notFound();
  }

  const completeOnboarding = completeOnboardingAction.bind(null, token);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef4fb_100%)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-sky-300">
            Employee Onboarding
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Complete your India payroll and compliance setup
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            This onboarding request was opened after admin approval. Submit your profile, bank/payroll details, and required document names so the admin can activate you.
          </p>

          <div className="mt-8 grid gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Candidate</p>
              <p className="mt-2 text-lg font-semibold text-white">{employee.fullName}</p>
              <p className="mt-1 text-sm text-slate-300">{employee.designation}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Offered Leave Policy</p>
              <p className="mt-2 text-sm text-slate-300">
                Casual: {employee.leavePolicy.casual} days · Sick: {employee.leavePolicy.sick} days · Earned: {employee.leavePolicy.earned} days
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <form className="grid gap-6" action={completeOnboarding}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Personal email</span>
                <input name="personalEmail" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Phone</span>
                <input name="phone" defaultValue={employee.phone} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Create password</span>
                <input type="password" name="password" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Bank name</span>
                <input name="bankName" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Account number</span>
                <input name="accountNumber" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>IFSC code</span>
                <input name="ifscCode" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>PAN</span>
                <input name="pan" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Aadhaar last 4</span>
                <input name="aadhaarLast4" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>UAN</span>
                <input name="uan" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>ESI number</span>
                <input name="esiNumber" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>PAN file name</span>
                <input name="doc_PAN" defaultValue="pan-card.pdf" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Aadhaar file name</span>
                <input name="doc_Aadhaar" defaultValue="aadhaar.pdf" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Bank proof file name</span>
                <input name="doc_Bank Proof" defaultValue="bank-proof.pdf" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
                Submit onboarding
              </button>
              <Link href="/login" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                Back to login
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
