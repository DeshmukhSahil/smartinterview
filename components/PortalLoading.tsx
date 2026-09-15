export default function PortalLoading({
  variant = "interview",
}: {
  variant?: "interview" | "list";
}) {
  if (variant === "list")
    return (
      <div role="status" aria-label="Loading invitations" className="space-y-5">
        <span className="sr-only">Loading your invitations…</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden="true"
            className="flex items-center gap-5 border-b border-slate-200 py-6 motion-safe:animate-pulse"
          >
            <div className="size-11 rounded-full bg-slate-200/60" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-1/3 rounded bg-slate-200/70" />
              <div className="h-4 w-2/3 rounded bg-slate-200/50" />
            </div>
            <div className="h-9 w-28 rounded bg-slate-200/50" />
          </div>
        ))}
      </div>
    );
  return (
    <section
      role="status"
      aria-label="Loading interview"
      className="mx-auto w-full max-w-5xl p-6 sm:p-10"
    >
      <span className="sr-only">Loading your interview…</span>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="mb-5 h-3 w-28 rounded bg-slate-200/70" />
        <div className="mb-10 h-8 w-2/3 rounded bg-slate-200/70" />
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <div className="h-4 w-full rounded bg-slate-200/60" />
            <div className="h-4 w-4/5 rounded bg-slate-200/60" />
            <div className="h-36 rounded-lg border border-slate-200 bg-white" />
          </div>
          <div className="h-60 rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
    </section>
  );
}
