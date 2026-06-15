/**
 * Fixed "Powered by Skybrook" attribution shown on every embed.
 *
 * This is product strategy, NOT styling — it is intentionally NOT a theme option
 * and must not be made removable per-org (see HANDOVER.md §2 and brief 032 §A.1).
 */
export function PoweredBySkybrook() {
  return (
    <a
      href="https://skybrook.com.au"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-2 right-2 z-50 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white no-underline shadow-sm backdrop-blur-sm hover:bg-black/80"
    >
      Powered by Skybrook
    </a>
  );
}
