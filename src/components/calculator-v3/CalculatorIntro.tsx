import { GlassOutletLogo } from "../brand/GlassOutletLogo";
import { JobNameEditor } from "../calculator/JobNameEditor";

interface CalculatorIntroProps {
  jobName: string;
  onJobNameChange: (name: string) => void;
  onStart: () => void;
}

export function CalculatorIntro({
  jobName,
  onJobNameChange,
  onStart,
}: CalculatorIntroProps) {
  return (
    <div className="relative min-h-full overflow-hidden bg-brand-bg text-brand-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.35),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.28),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(245,158,11,0.18),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-8 px-5 py-12 text-center">
        <div className="space-y-8">
          <GlassOutletLogo
            className="justify-center text-brand-primary"
            iconClassName="h-20 w-24 sm:h-24 sm:w-28 lg:h-28 lg:w-32"
            textClassName="text-5xl sm:text-7xl lg:text-8xl"
          />
          <form
            className="mx-auto w-full max-w-xl rounded-3xl border border-brand-border/70 bg-brand-card/80 p-5 text-left shadow-2xl backdrop-blur"
            onSubmit={(event) => {
              event.preventDefault();
              onStart();
            }}
          >
            <JobNameEditor
              value={jobName}
              onChange={onJobNameChange}
              onCommit={onStart}
              autoFocus
              inputClassName="rounded-2xl px-4 py-3 text-center text-xl font-semibold"
              textClassName="mx-auto text-center text-xl font-semibold"
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-brand-primary/90 hover:shadow-sm"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
