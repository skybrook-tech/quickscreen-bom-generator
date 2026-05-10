import { QRCodeSVG } from "qrcode.react";
import { INSTALL_VIDEOS, type InstallVideoKey } from "../../lib/installVideos";

interface InstallVideoQRProps {
  videoKey: InstallVideoKey;
  compact?: boolean;
}

export function InstallVideoQR({ videoKey, compact = false }: InstallVideoQRProps) {
  const video = INSTALL_VIDEOS[videoKey];

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-3 rounded-xl border border-brand-border bg-brand-bg/70 p-3 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary/5 ${
        compact ? "max-w-xs" : ""
      }`}
      title={`${video.label}: ${video.url}`}
    >
      <span className="rounded-lg bg-white p-1">
        <QRCodeSVG value={video.url} size={compact ? 54 : 68} marginSize={1} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold uppercase tracking-wide text-brand-text">
          Install video
        </span>
        <span className="block text-xs font-semibold text-brand-muted">
          {video.label}
        </span>
        <span className="block truncate font-mono text-[10px] text-brand-primary">
          {video.url}
        </span>
      </span>
    </a>
  );
}

