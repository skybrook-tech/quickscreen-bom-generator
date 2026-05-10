import { Mic, MicOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { parseDescription, type ParseResult } from "../../lib/describeFenceParser";
import { createVoiceInput, supportsVoiceInput } from "../../lib/voiceInput";
import { ParsePreviewCard } from "./ParsePreviewCard";

export function DescribeFenceBox({
  title = "Describe more attributes",
  compact = false,
  initialDescription = "",
  onApply,
}: {
  title?: string;
  compact?: boolean;
  initialDescription?: string;
  onApply: (result: ParseResult) => void;
}) {
  const [open, setOpen] = useState(!compact);
  const [text, setText] = useState(initialDescription);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [listening, setListening] = useState(false);
  const voiceRef = useRef<ReturnType<typeof createVoiceInput> | null>(null);
  const canUseVoice = useMemo(() => supportsVoiceInput(), []);

  useEffect(() => {
    setText(initialDescription);
  }, [initialDescription]);

  function parseNow() {
    if (!text.trim()) {
      toast.error("Add a short fence description first.");
      return;
    }
    setResult(parseDescription(text));
  }

  function toggleMic() {
    if (!canUseVoice) return;
    if (listening) {
      voiceRef.current?.stop();
      setListening(false);
      return;
    }
    const voice = createVoiceInput({
      onTranscript: (transcript) => setText((value) => `${value}${value ? " " : ""}${transcript}`),
      onError: (message) => {
        toast.error(message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (!voice) return;
    voiceRef.current = voice;
    setListening(true);
    voice.start();
  }

  if (!open && compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-brand-border bg-brand-card px-3 py-2 text-left text-xs font-semibold text-brand-muted hover:border-brand-primary hover:text-brand-primary"
      >
        {initialDescription ? (
          <>
            Original description: {initialDescription.slice(0, 60)}{initialDescription.length > 60 ? "..." : ""}{" "}
            <span className="font-black">View full</span>
          </>
        ) : (
          <span className="font-black">{title}</span>
        )}
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-border/70 bg-brand-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => compact && setOpen((value) => !value)}
          className="text-left text-sm font-black text-brand-text"
        >
          {title}
        </button>
        {compact && (
          <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-brand-muted hover:text-brand-primary">
            Collapse
          </button>
        )}
      </div>
      {open && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => {
                if (text.trim()) window.setTimeout(parseNow, 800);
              }}
              placeholder="e.g. 30m of 1.8m slat fence in Monument with one gate"
              className="min-h-28 w-full resize-y rounded-xl border border-brand-border bg-brand-bg px-3 py-3 pr-11 text-sm font-semibold text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            {canUseVoice && (
              <button
                type="button"
                onClick={toggleMic}
                className={`absolute right-2 top-2 rounded-lg border p-2 ${listening ? "border-brand-danger text-brand-danger" : "border-brand-border text-brand-muted hover:text-brand-primary"}`}
                title={listening ? "Stop dictation" : "Dictate description"}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={parseNow}
            className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-black text-white hover:bg-brand-primary/90"
          >
            Parse
          </button>
          {result && (
            <ParsePreviewCard
              result={result}
              onChange={setResult}
              onApply={(next) => {
                onApply(next);
                setResult(next);
                if (compact) setOpen(false);
              }}
              onEdit={() => setOpen(true)}
              onClear={() => setResult(null)}
            />
          )}
        </div>
      )}
    </section>
  );
}
