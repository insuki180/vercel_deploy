import { SkeletonBlock } from "@/components/ui/portal-kit";

export function PortalLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-12 w-full max-w-3xl" />
          <SkeletonBlock className="h-5 w-full max-w-2xl" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-white/60 bg-white/85 p-5 shadow-sm backdrop-blur">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-4 h-9 w-24" />
            <SkeletonBlock className="mt-4 h-4 w-40" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <section
            key={index}
            className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur"
          >
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="mt-2 h-4 w-64" />
            <div className="mt-6 space-y-3">
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
              <SkeletonBlock className="h-14 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
