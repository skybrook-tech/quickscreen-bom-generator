import { useCallback, useEffect, useRef } from "react";

/**
 * postMessage bridge from the embedded calculator (inside an iframe) up to the
 * host supplier page. Mirrors the contract documented in `public/embed.js`:
 *
 *   • quickscreen:ready          — once, on mount
 *   • quickscreen:resize         — on content height change (ResizeObserver)
 *   • quickscreen:quote-created  — after a successful quote save (TOTALS ONLY —
 *                                  never line items, SKUs, or trade pricing)
 *
 * No-ops when not actually framed (`window.parent === window`) so the same
 * component renders harmlessly at /embed/:slug opened directly in a tab.
 *
 * targetOrigin is '*' for ready/resize — they carry no sensitive data and the
 * embed can land on any supplier domain. quote-created also uses '*' today;
 * once per-org `embed_domains` is enforced server-side it should be narrowed to
 * the configured origin (see brief 032 §C.7 and migration 040/041).
 */
export function useEmbedBridge(rootRef: React.RefObject<HTMLElement | null>, active: boolean) {
  const lastHeightRef = useRef(0);

  const isFramed = typeof window !== "undefined" && window.parent !== window;

  const post = useCallback(
    (message: Record<string, unknown>) => {
      if (!active || !isFramed) return;
      window.parent.postMessage(message, "*");
    },
    [active, isFramed],
  );

  // Announce readiness once, and observe content height for auto-resize.
  useEffect(() => {
    if (!active || !isFramed) return;
    post({ type: "quickscreen:ready" });

    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const sendHeight = () => {
      // scrollHeight captures the full content even when the element itself is
      // viewport-capped, so the parent iframe grows instead of inner-scrolling.
      const h = Math.ceil(el.scrollHeight);
      if (h > 0 && h !== lastHeightRef.current) {
        lastHeightRef.current = h;
        post({ type: "quickscreen:resize", height: h });
      }
    };

    const ro = new ResizeObserver(sendHeight);
    ro.observe(el);
    sendHeight(); // initial measure

    return () => ro.disconnect();
  }, [active, isFramed, post, rootRef]);

  const postQuoteCreated = useCallback(
    (quoteId: string, totalIncGst: number, productCount: number) => {
      post({
        type: "quickscreen:quote-created",
        quoteId,
        totalIncGst,
        productCount,
      });
    },
    [post],
  );

  return { postQuoteCreated };
}
