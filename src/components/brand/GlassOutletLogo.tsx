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
    <div className={`inline-flex items-center gap-3 text-brand-primary ${className}`}>
      <svg
        viewBox="0 0 132 118"
        aria-hidden="true"
        className={`h-14 w-16 shrink-0 ${iconClassName}`}
        fill="none"
      >
        <rect x="3" y="20" width="84" height="82" rx="3" stroke="currentColor" strokeWidth="6" />
        <rect x="17" y="8" width="84" height="82" rx="3" stroke="currentColor" strokeWidth="6" />
        <rect x="31" y="29" width="84" height="82" rx="3" stroke="currentColor" strokeWidth="6" />
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
