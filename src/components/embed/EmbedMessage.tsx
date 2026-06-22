/**
 * Full-page neutral panel used for the embed's non-calculator states:
 * loading, "not enabled for this org", and "not enabled for this site"
 * (referrer mismatch). Deliberately plain — no app chrome, no branding leakage.
 */
export function EmbedMessage({
  title,
  body,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="flex min-h-[480px] w-full items-center justify-center bg-brand-bg p-8 text-center">
      <div className="max-w-md space-y-2">
        <p className="text-base font-medium text-brand-text">{title}</p>
        {body && <p className="text-sm text-brand-muted">{body}</p>}
      </div>
    </div>
  );
}
