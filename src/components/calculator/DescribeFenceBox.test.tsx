import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DescribeFenceBox } from "./DescribeFenceBox";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SpeechRecognitionHandler = ((event: never) => void) | null;

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: SpeechRecognitionHandler = null;
  onerror: SpeechRecognitionHandler = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
}

function installSpeechRecognition() {
  FakeSpeechRecognition.instances = [];
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: FakeSpeechRecognition,
  });
}

function renderDescribeFenceBox() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<DescribeFenceBox onApply={() => undefined} />);
  });

  return { container, root };
}

describe("DescribeFenceBox voice input", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
    vi.restoreAllMocks();
  });

  it("returns the mic button to idle after speech recognition ends", () => {
    installSpeechRecognition();
    const { container, root } = renderDescribeFenceBox();
    const micButton = () => container.querySelector<HTMLButtonElement>('button[title="Dictate description"]');

    expect(micButton()).not.toBeNull();

    act(() => {
      micButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(FakeSpeechRecognition.instances[0]?.start).toHaveBeenCalledTimes(1);
    expect(container.querySelector('button[title="Stop dictation"]')).not.toBeNull();

    act(() => {
      FakeSpeechRecognition.instances[0]?.onend?.();
    });

    expect(micButton()).not.toBeNull();

    act(() => {
      micButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(FakeSpeechRecognition.instances).toHaveLength(2);
    expect(FakeSpeechRecognition.instances[1]?.start).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
  });

  it("cleans up the active speech recognition instance on unmount", () => {
    installSpeechRecognition();
    const { container, root } = renderDescribeFenceBox();

    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[title="Dictate description"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const instance = FakeSpeechRecognition.instances[0];

    act(() => root.unmount());

    expect(instance?.stop).toHaveBeenCalledTimes(1);
    expect(instance?.onresult).toBeNull();
    expect(instance?.onerror).toBeNull();
    expect(instance?.onend).toBeNull();
  });
});
