import { useState } from "react";
import {
  MessageSquare,
  ArrowLeft,
  Wand2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { parseJobDescription } from "../../utils/parseJobDescription";

interface ParseStepProps {
  onBack: () => void;
  onContinue: (description: string) => void;
}

type ParseStatus =
  | { type: "success"; detected: string[] }
  | { type: "error"; message: string }
  | null;

export function ParseStep({ onBack, onContinue }: ParseStepProps) {
  const { dispatch } = useFenceConfig();
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
      onContinue(descText);
    }
  };

  const handleContinue = () => {
    // If there's text but hasn't been parsed yet, try parsing first
    if (descText.trim() && !parseStatus) {
      const { config, detected } = parseJobDescription(descText);
      if (detected.length > 0) dispatch({ type: "SET_CONFIG", config });
    }
    onContinue(descText);
  };

  return (
    <div className="animate-fade-in-up max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft size={14} />
        Back
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
