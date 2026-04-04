"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";

const toneStyles: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-sky-100 text-sky-700 ring-sky-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
};

export function PortalPage({
  eyebrow,
  title,
  description,
  sourceLabel,
  actions,
  metrics,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sourceLabel?: string;
  actions?: ReactNode;
  metrics?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.16),_transparent_35%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.4em] text-slate-500">
              {eyebrow}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
            {sourceLabel ? (
              <span className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white">
                {sourceLabel}
              </span>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>
      {metrics ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics}</div> : null}
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", toneStyles[tone])}>
          Live
        </span>
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1", toneStyles[tone], className)}>
      {children}
    </span>
  );
}

export function statusToneFor(status: string | null | undefined): Tone {
  const normalized = (status ?? "").toLowerCase();
  if (["approved", "verified", "generated", "active", "completed", "ready"].some((item) => normalized.includes(item))) {
    return "emerald";
  }
  if (["rejected", "inactive", "expired"].some((item) => normalized.includes(item))) {
    return "rose";
  }
  if (["pending", "submitted", "draft", "review", "progress"].some((item) => normalized.includes(item))) {
    return "amber";
  }
  return "slate";
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusToneFor(status)}>{status.replaceAll("_", " ")}</Badge>;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClasses =
    variant === "primary"
      ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800"
      : variant === "secondary"
        ? "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50"
        : "bg-transparent text-slate-700 hover:bg-slate-100";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses,
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function PendingSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "primary",
  className,
}: {
  idleLabel: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} loading={pending} disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-3xl bg-slate-200/70", className)} />;
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",
        className,
      )}
    />
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",
        className,
      )}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 p-10 text-center">
      <div className="rounded-full bg-slate-950/5 p-3 text-slate-500">
        <AlertTriangle size={18} />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>
          {actionLabel}
          <ArrowUpRight size={16} />
        </Button>
      ) : null}
    </div>
  );
}
