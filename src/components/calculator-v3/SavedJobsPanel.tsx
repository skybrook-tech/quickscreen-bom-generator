import { ChevronDown, Clock3, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SavedJob } from "../../hooks/useJobs";

interface SavedJobsPanelProps {
  jobs: SavedJob[];
  onLoad: (job: SavedJob) => void;
  onDelete: (id: string) => void;
}

const moneyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function SavedJobsPanel({
  jobs,
  onLoad,
  onDelete,
}: SavedJobsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-brand-border/20"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-text">
          <Clock3 size={16} className="text-brand-muted" />
          Recent jobs
          <span className="rounded-full bg-brand-border/60 px-1.5 py-0.5 text-xs font-medium leading-none text-brand-muted">
            {jobs.length}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-brand-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-brand-border p-3">
          {jobs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-brand-border bg-brand-bg px-4 py-6 text-center text-sm text-brand-muted">
              No saved jobs yet — your first save will appear here
            </p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="grid gap-3 rounded-lg border border-brand-border bg-brand-bg p-3 sm:grid-cols-[1fr_auto]"
                >
                  <button
                    type="button"
                    onClick={() => onLoad(job)}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-brand-text">
                      {job.name}
                    </span>
                    <span className="mt-1 block text-xs text-brand-muted">
                      {dateFormatter.format(new Date(job.updatedAt))} ·{" "}
                      {job.runCount} {job.runCount === 1 ? "run" : "runs"}
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-sm font-semibold tabular-nums text-brand-text">
                      {moneyFormatter.format(job.totalCost)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(job.id)}
                      className="rounded p-1.5 text-brand-muted transition-colors hover:bg-brand-border/40 hover:text-brand-text"
                      aria-label={`Delete ${job.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
