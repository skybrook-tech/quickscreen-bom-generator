type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function supportsVoiceInput() {
  return recognitionCtor() !== null;
}

export function createVoiceInput({
  onTranscript,
  onError,
  onEnd,
}: {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}) {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-AU";
  recognition.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result?.isFinal) finalText += result[0]?.transcript ?? "";
    }
    if (finalText.trim()) onTranscript(finalText.trim());
  };
  recognition.onerror = (event) => onError(event.error ? `Couldn't access mic - ${event.error}` : "Couldn't access mic - type instead");
  recognition.onend = onEnd;
  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}
