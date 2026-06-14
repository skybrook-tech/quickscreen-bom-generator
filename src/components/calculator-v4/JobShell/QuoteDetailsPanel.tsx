import {
  useCalculatorV4,
  type QuoteDetails,
} from "../../../context/CalculatorContextV4";

const LABEL_CLASS =
  "block text-[11px] font-medium uppercase tracking-wider text-brand-muted";
const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg bg-transparent border border-brand-border text-sm text-brand-text focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none rounded-none px-0 w-full bg-transparent focus:ring-0 border-b-2 border-transparent border-t-0 border-l-0 border-r-0 hover:border-brand-border border-dashed focus:border-b-2 border-dashed focus:border-brand-border";

/**
 * Collapsible panel for capturing customer / quote metadata before saving or
 * exporting a PDF. Collapsed by default — doesn't interrupt the main workflow.
 */
export function QuoteDetailsPanel() {
  const { state, dispatch } = useCalculatorV4();
  const quoteDetails = state.quoteDetails as QuoteDetails;

  function set(field: keyof QuoteDetails, value: string) {
    dispatch({ type: "SET_QUOTE_DETAILS", details: { [field]: value } });
  }

  return (
    <div className="overflow-hidden">
      {/* <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-border/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-brand-text">
            Quote details
          </span>
          {!open && hasContent && (
            <span className="text-xs text-brand-muted truncate max-w-[180px]">
              {quoteDetails.customer || quoteDetails.email || quoteDetails.siteAddress}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "text-brand-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && ( */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL_CLASS}>Customer name</label>
          <input
            type="text"
            value={quoteDetails.customer}
            onChange={(e) => set("customer", e.target.value)}
            placeholder="e.g. Smith Residence"
            className={INPUT_CLASS}
            data-testid="v4-quote-customer"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            value={quoteDetails.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="customer@example.com"
            className={INPUT_CLASS}
            data-testid="v4-quote-email"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Phone</label>
          <input
            type="tel"
            value={quoteDetails.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="04xx xxx xxx"
            className={INPUT_CLASS}
            data-testid="v4-quote-phone"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Site address</label>
          <input
            type="text"
            value={quoteDetails.siteAddress}
            onChange={(e) => set("siteAddress", e.target.value)}
            placeholder="123 Example St, Suburb"
            className={INPUT_CLASS}
            data-testid="v4-quote-address"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Valid until</label>
          <input
            type="date"
            value={quoteDetails.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            className={INPUT_CLASS}
            data-testid="v4-quote-valid-until"
          />
        </div>
      </div>
      {/* )} */}
    </div>
  );
}
