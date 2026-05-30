import { Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const INSTALL_DISMISSED_KEY = "qsbom-pwa-install-dismissed-at";
const IOS_HINT_SEEN_KEY = "qsbom-pwa-ios-hint-seen";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function canShowInstallPrompt() {
  const dismissedAt = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY) ?? 0);
  return !dismissedAt || Date.now() - dismissedAt > THIRTY_DAYS_MS;
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isIos && isSafari && !standalone;
}

export function PwaStatusBanners() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHidden, setInstallHidden] = useState(false);
  const [iosHintVisible, setIosHintVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!canShowInstallPrompt()) return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!canShowInstallPrompt()) return;
    if (!isIosSafari()) return;
    if (window.localStorage.getItem(IOS_HINT_SEEN_KEY) === "true") return;
    setIosHintVisible(true);
  }, []);

  const showInstall = Boolean(installEvent && !installHidden);
  const visible = useMemo(
    () => showInstall || iosHintVisible,
    [iosHintVisible, showInstall],
  );

  if (!visible) return null;

  return (
    <div className="space-y-2 border-b border-brand-border bg-brand-card px-3 py-2 text-sm font-bold text-brand-text">
      {showInstall && installEvent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-primary/40 bg-brand-primary/10 px-3 py-2 text-brand-primary">
          <span className="inline-flex items-center gap-2">
            <Download size={16} />
            Install QuickScreen for offline access
          </span>
          <span className="inline-flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await installEvent.prompt();
                setInstallHidden(true);
                setInstallEvent(null);
              }}
              className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-black text-white"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
                setInstallHidden(true);
              }}
              className="rounded-lg border border-brand-primary/40 px-3 py-2 text-xs font-black"
            >
              Dismiss
            </button>
          </span>
        </div>
      )}

      {iosHintVisible && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-brand-muted">
          <span>Install on iPhone: tap Share, then Add to Home Screen.</span>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem(IOS_HINT_SEEN_KEY, "true");
              setIosHintVisible(false);
            }}
            className="rounded-md p-1 hover:bg-brand-border/40"
            aria-label="Dismiss install instructions"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
