"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DetailModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/60 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Expanded record view for faster operational decisions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50",
            )}
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
