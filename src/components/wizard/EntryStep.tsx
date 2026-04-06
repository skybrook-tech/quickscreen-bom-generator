import { useState } from "react";
import {
  MessageSquare,
  PenTool,
  Settings2,
  ArrowLeft,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { FenceLayoutCanvas } from "../canvas/FenceLayoutCanvas";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { parseJobDescription } from "../../utils/parseJobDescription";

interface EntryStepProps {
  onStartManual: () => void;
  onStartLayout: () => void;
  onStartDescribe: (description: string) => void;
}

type Mode = "cards" | "describe" | "canvas";

type ParseStatus =
  | { type: "success"; detected: string[] }
  | { type: "error"; message: string }
  | null;

export function EntryStep({
  onStartManual,
  onStartLayout,
  onStartDescribe,
}: EntryStepProps) {
  const { dispatch } = useFenceConfig();
  const [mode, setMode] = useState<Mode>("cards");
  const [descText, setDescText] = useState("");
  const [parseStatus, setParseStatus] = useState<ParseStatus>(null);

  const handleParse = () => {
    if (!descText.trim()) return;
    const { config, detected } = parseJobDescription(descText);
    if (detected.length === 0) {
      setParseStatus({
        type: "error",
        message: "Nothing detected — try again or skip and continue.",
      });
    } else {
      dispatch({ type: "SET_CONFIG", config });
      setParseStatus({ type: "success", detected });
      // Auto-advance on successful parse
      onStartDescribe(descText);
    }
  };

  const handleContinue = () => {
    // If there's text but hasn't been parsed yet, try parsing first
    if (descText.trim() && !parseStatus) {
      const { config, detected } = parseJobDescription(descText);
      if (detected.length > 0) dispatch({ type: "SET_CONFIG", config });
    }
    onStartDescribe(descText);
  };

  // ── Canvas mode ────────────────────────────────────────────────────
  if (mode === "canvas") {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button
          type="button"
          onClick={() => setMode("cards")}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to start
        </button>

        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-brand-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                <PenTool size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text">
                  Draw Your Fence Layout
                </p>
                <p className="text-xs text-brand-muted">
                  Sketch the run, place gate markers, then click Use This Layout
                  to pre-fill the form
                </p>
              </div>
            </div>
          </div>
          <ErrorBoundary label="Layout Tool">
            <FenceLayoutCanvas onApplied={onStartLayout} />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  // ── Describe mode (full-screen) ────────────────────────────────────
  if (mode === "describe") {
    return (
      <div className="animate-fade-in-up max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => {
            setMode("cards");
            setParseStatus(null);
          }}
          className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to start
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-text">
                Describe the Job
              </h2>
              <p className="text-sm text-brand-muted">
                We'll detect run length, height, colour, system type, and more.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
          <textarea
            value={descText}
            onChange={(e) => {
              setDescText(e.target.value);
              setParseStatus(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleParse();
            }}
            rows={8}
            autoFocus
            placeholder={
              'e.g. "20m run of QSHS horizontal slat fence, 1800mm high, surfmist matt, concreted in ground, post-to-post, 2 corners, one single swing gate 900mm wide"'
            }
            className="w-full px-3 py-2.5 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-colors resize-none leading-relaxed"
          />

          <p className="text-xs text-brand-muted">
            Tip: Include run length, height, colour, slat size, system type
            (QSHS/VS/XPL/BAYG), post mounting, terminations, corners, and gate
            info.
          </p>

          {/* <p className="ml-1 opacity-60 text-xs text-brand-muted">
            ⌘ Cmd+Enter to parse.
          </p> */}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleParse}
              disabled={!descText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              <Wand2 size={14} />
              Parse Description
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
            >
              Skip and continue →
            </button>
          </div>
          <div>
            {parseStatus?.type === "success" && (
              <div className="flex items-center gap-1.5 text-sm text-green-400 animate-fade-in">
                <CheckCircle2 size={14} />
                <span>Detected: {parseStatus.detected.join(", ")}</span>
              </div>
            )}
            {parseStatus?.type === "error" && (
              <div className="flex items-center gap-1.5 text-sm text-amber-400 animate-fade-in">
                <AlertCircle size={14} />
                <span>{parseStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3"></div>
      </div>
    );
  }

  // ── Cards mode ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-brand-text">
          How would you like to start?
        </h2>
        <p className="text-sm text-brand-muted">
          Choose the best way to describe your fencing job.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ── Describe the Job ─────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setMode("describe")}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <MessageSquare size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Describe the Job
              </p>
              <p className="text-xs text-brand-muted">
                Write in plain English — we'll parse it
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Type a description and our parser automatically detects run length,
            height, colour, system type, post mounting, and more.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Start describing →
          </div>
        </button>

        {/* ── Use Layout Tool ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setMode("canvas")}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex-col gap-4 hidden sm:flex"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <PenTool size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Use Layout Tool
              </p>
              <p className="text-xs text-brand-muted">
                Draw your fence on a canvas
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Sketch the fence run, place gate markers, and transfer measurements
            directly into the configuration form.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Open canvas →
          </div>
        </button>

        {/* ── Configure Manually ───────────────────────────────────── */}
        <button
          type="button"
          data-testid="configure-manually-btn"
          onClick={onStartManual}
          className="group rounded-xl border border-brand-border bg-brand-card hover:border-brand-accent/60 hover:shadow-lg hover:shadow-brand-accent/5 hover:-translate-y-0.5 transition-all duration-200 p-6 text-left flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0 group-hover:bg-brand-accent/15 transition-colors">
              <Settings2 size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-text">
                Configure Manually
              </p>
              <p className="text-xs text-brand-muted">
                Jump straight to the form
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Fill in run length, height, system type, colours, and gate details
            directly — fastest if you already know the specs.
          </p>
          <div className="mt-auto text-xs text-brand-accent font-medium group-hover:underline">
            Go to form →
          </div>
        </button>
      </div>
    </div>
  );
}
