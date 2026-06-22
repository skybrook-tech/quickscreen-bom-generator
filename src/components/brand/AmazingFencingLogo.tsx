interface AmazingFencingLogoProps {
  className?: string;
}

export function AmazingFencingLogo({ className = "" }: AmazingFencingLogoProps) {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Visual box structure matching card logo */}
      <div className="w-56 overflow-hidden rounded-md border-2 border-white shadow-md">
        {/* Blue AMAZING Box */}
        <div className="bg-[#319ad6] py-2.5 px-4 text-center border-b-2 border-white">
          <span className="block font-black text-2xl tracking-[0.08em] text-white leading-none font-sans">
            AMAZING
          </span>
        </div>
        {/* Orange FENCING Box */}
        <div className="bg-[#f39200] py-2.5 px-4 text-center">
          <span className="block font-black text-2xl tracking-[0.08em] text-white leading-none font-sans">
            FENCING
          </span>
        </div>
      </div>
      
      {/* Black Stamp: TRADE & DIY SUPPLIES */}
      <div className="mt-2 text-center">
        <div className="inline-block border-2 border-dashed border-slate-800 dark:border-slate-200 px-2 py-0.5 rounded rotate-[-2deg]">
          <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-850 dark:text-slate-100 font-mono">
            TRADE & DIY SUPPLIES
          </span>
        </div>
      </div>
    </div>
  );
}
