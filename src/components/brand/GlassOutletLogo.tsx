interface GlassOutletLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showThe?: boolean;
}

export function GlassOutletLogo({
  className = "",
  iconClassName = "",
  textClassName = "",
  showThe = true,
}: GlassOutletLogoProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 text-brand-primary ${className}`}
      data-print-logo
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={`h-14 w-16 shrink-0 ${iconClassName}`}
        fill="none"
        stroke="currentColor"
        strokeLinejoin="miter"
        data-print-logo-symbol
      >
        <rect x="6" y="36" width="58" height="58" strokeWidth="3.5" />
        <rect x="21" y="21" width="58" height="58" strokeWidth="3.5" />
        <rect x="36" y="6" width="58" height="58" strokeWidth="3.5" />
      </svg>
      <div className={`leading-none ${textClassName}`}>
        {showThe && (
          <span className="mb-1 block text-[0.32em] font-black uppercase tracking-[0.32em]">
            The
          </span>
        )}
        <span className="block font-black tracking-[0.22em]">glass</span>
        <span className="mt-2 block font-black tracking-[0.22em]">outlet</span>
      </div>
    </div>
  );
}
