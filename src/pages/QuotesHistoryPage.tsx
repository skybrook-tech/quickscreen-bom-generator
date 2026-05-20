import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Filter, Trash2, Plus, FileText, Search } from "lucide-react";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../hooks/useAuth";
import { useQuotes } from "../hooks/useQuotes";
import { formatLayoutLabel, isJobNameFallback } from "../lib/quoteListMeta";
import type { QuoteStatus } from "../types/quote.types";

type CreatedByFilter = "mine" | "all" | "users";
type StatusFilter = "any" | QuoteStatus;
type DateFilter = "any" | "today" | "7d" | "30d" | "year";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "expired", label: "Expired" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "year", label: "This year" },
];

const FILTER_SELECT_CLASS =
  "appearance-none pl-3 pr-8 py-1.5 min-w-[6.5rem] text-sm bg-brand-card border border-brand-border rounded-md text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-accent/40 focus:border-brand-accent cursor-pointer";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-brand-muted whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  "aria-label": string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={ariaLabel}
        className={FILTER_SELECT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
      />
    </div>
  );
}

function CreatedByDropdown({
  mode,
  options,
  selectedIds,
  currentUserId,
  onModeChange,
  onToggle,
}: {
  mode: CreatedByFilter;
  options: [string, string][];
  selectedIds: Set<string>;
  currentUserId: string | undefined;
  onModeChange: (mode: CreatedByFilter) => void;
  onToggle: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const triggerLabel = useMemo(() => {
    if (mode === "mine") return "Me";
    if (mode === "all") return "Any";
    if (selectedIds.size === 0) return "Any";
    if (selectedIds.size === 1) {
      const id = [...selectedIds][0];
      return options.find(([userId]) => userId === id)?.[1] ?? "1 person";
    }
    return `${selectedIds.size} people`;
  }, [mode, options, selectedIds]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Created by"
        className={`${FILTER_SELECT_CLASS} inline-flex items-center justify-between gap-2 text-left min-w-[7rem]`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-brand-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable={mode === "users"}
          className="absolute left-0 z-20 mt-1 min-w-[12rem] max-h-60 overflow-y-auto rounded-md border border-brand-border bg-brand-card py-1 shadow-lg"
        >
          <button
            type="button"
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-brand-bg/60 ${mode === "mine" ? "text-brand-accent font-medium" : "text-brand-text"}`}
            onClick={() => {
              onModeChange("mine");
              setOpen(false);
            }}
          >
            Me
          </button>
          <button
            type="button"
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-brand-bg/60 ${mode === "all" ? "text-brand-accent font-medium" : "text-brand-text"}`}
            onClick={() => {
              onModeChange("all");
              setOpen(false);
            }}
          >
            Any
          </button>
          {options.length > 0 && (
            <>
              <div className="my-1 border-t border-brand-border/60" />
              {options.map(([userId, name]) => (
                <label
                  key={userId}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-text cursor-pointer hover:bg-brand-bg/60"
                >
                  <input
                    type="checkbox"
                    checked={mode === "users" && selectedIds.has(userId)}
                    onChange={() => onToggle(userId)}
                    className="accent-brand-accent rounded"
                  />
                  <span className="truncate">
                    {name}
                    {userId === currentUserId ? (
                      <span className="text-brand-muted"> (you)</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function quoteMatchesDate(createdAt: string, dateFilter: DateFilter): boolean {
  if (dateFilter === "any") return true;
  const created = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  switch (dateFilter) {
    case "today":
      return created >= startOfToday;
    case "7d":
      return created >= new Date(now.getTime() - 7 * 86_400_000);
    case "30d":
      return created >= new Date(now.getTime() - 30 * 86_400_000);
    case "year":
      return created.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

const STATUS_COLOURS: Record<string, string> = {
  draft: "text-brand-muted bg-brand-border/30",
  sent: "text-brand-primary bg-brand-primary/10",
  accepted: "text-brand-success bg-brand-success/10",
  expired: "text-brand-danger bg-brand-danger/10",
};

export function QuotesHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotesQuery, deleteQuote } = useQuotes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("any");
  const [dateFilter, setDateFilter] = useState<DateFilter>("any");
  const [createdByFilter, setCreatedByFilter] =
    useState<CreatedByFilter>("mine");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set(),
  );

  const quotes = quotesQuery.data ?? [];

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const quote of quotes) {
      if (!map.has(quote.user_id)) {
        map.set(quote.user_id, quote.creatorName ?? "Unknown");
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [quotes]);

  const toggleCreator = (userId: string) => {
    setCreatedByFilter("users");
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreatedByModeChange = (mode: CreatedByFilter) => {
    setCreatedByFilter(mode);
    if (mode !== "users") setSelectedUserIds(new Set());
  };

  const filtered = useMemo(() => {
    let result = quotes;
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((q) => q.jobName.toLowerCase().includes(query));
    }
    if (statusFilter !== "any") {
      result = result.filter((q) => q.status === statusFilter);
    }
    if (dateFilter !== "any") {
      result = result.filter((q) => quoteMatchesDate(q.created_at, dateFilter));
    }
    if (createdByFilter === "mine" && user?.id) {
      result = result.filter((q) => q.user_id === user.id);
    } else if (createdByFilter === "users") {
      if (selectedUserIds.size === 0) {
        result = [];
      } else {
        result = result.filter((q) => selectedUserIds.has(q.user_id));
      }
    }
    return result;
  }, [
    quotes,
    search,
    statusFilter,
    dateFilter,
    createdByFilter,
    selectedUserIds,
    user?.id,
  ]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "any" ||
    dateFilter !== "any" ||
    createdByFilter !== "mine";

  const openQuote = (quoteId: string) => {
    navigate(`/quote/${quoteId}`);
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    quoteId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openQuote(quoteId);
    }
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-brand-text">Quotes</h1>
            <p className="text-sm text-brand-muted mt-0.5">
              {quotes.length === 0
                ? "No quotes yet"
                : hasActiveFilters && filtered.length !== quotes.length
                  ? `${filtered.length} of ${quotes.length} quotes`
                  : `${quotes.length} quote${quotes.length !== 1 ? "s" : ""} saved`}
            </p>
          </div>
          <Link
            to="/fence-calculator"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            <Plus size={16} />
            New Quote
          </Link>
        </div>

        {/* ── Filters ──────────────────────────────────────────────── */}
        {quotes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Filter
              size={16}
              className="text-brand-muted shrink-0"
              aria-hidden
            />

            <FilterField label="Status">
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                aria-label="Status"
              />
            </FilterField>

            <FilterField label="Created by">
              <CreatedByDropdown
                mode={createdByFilter}
                options={creatorOptions}
                selectedIds={selectedUserIds}
                currentUserId={user?.id}
                onModeChange={handleCreatedByModeChange}
                onToggle={toggleCreator}
              />
            </FilterField>

            <FilterField label="Date">
              <FilterSelect
                value={dateFilter}
                onChange={setDateFilter}
                options={DATE_OPTIONS}
                aria-label="Date"
              />
            </FilterField>

            <div className="relative flex-1 min-w-[12rem] max-w-xs sm:ml-auto">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job name…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-md text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-accent/40 focus:border-brand-accent transition-colors"
              />
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────── */}
        <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          {quotesQuery.isLoading && (
            <p className="px-5 py-10 text-sm text-brand-muted text-center">
              Loading quotes…
            </p>
          )}

          {quotesQuery.isError && (
            <p className="px-5 py-10 text-sm text-brand-danger text-center">
              Failed to load quotes.
            </p>
          )}

          {!quotesQuery.isLoading && quotes.length === 0 && (
            <div className="px-5 py-16 text-center space-y-3">
              <FileText size={20} className="mx-auto text-brand-border" />
              <p className="text-sm text-brand-muted">No quotes saved yet.</p>
              <Link
                to="/fence-calculator"
                className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:underline"
              >
                <Plus size={16} /> Create your first quote
              </Link>
            </div>
          )}

          {!quotesQuery.isLoading && quotes.length > 0 && filtered.length === 0 && (
            <p className="px-5 py-10 text-sm text-brand-muted text-center">
              {createdByFilter === "users" && selectedUserIds.size === 0
                ? "Select one or more people to show their quotes."
                : hasActiveFilters
                  ? "No quotes match the current filters."
                  : "No quotes found."}
            </p>
          )}

          {filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted">
                    Job name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden sm:table-cell">
                    Created by
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden sm:table-cell">
                    System
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden md:table-cell">
                    Layout
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-brand-muted">
                    Total (inc. GST)
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-muted hidden sm:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((quote, i) => {
                  const layoutLabel = formatLayoutLabel({
                    runs: quote.runCount,
                    segments: quote.segmentCount,
                    gates: quote.gateCount,
                  });
                  const showQuoteNumber = !isJobNameFallback(
                    quote.jobName,
                    quote.quote_number,
                  );

                  return (
                    <tr
                      key={quote.id}
                      role="link"
                      tabIndex={0}
                      title="Open quote"
                      onClick={() => openQuote(quote.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, quote.id)}
                      className={`cursor-pointer hover:bg-brand-bg/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-accent/50 ${
                        i < filtered.length - 1
                          ? "border-b border-brand-border/60"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-text">
                          {quote.jobName}
                        </p>
                        {showQuoteNumber && (
                          <p className="text-xs text-brand-muted">
                            #{quote.quote_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                        {quote.creatorName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                        {quote.systemLabel}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                        {layoutLabel}
                      </td>
                      <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                        {new Date(quote.created_at).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-text">
                        {quote.displayTotal != null
                          ? `$${quote.displayTotal.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[quote.status] ?? "text-brand-muted bg-brand-border/30"}`}
                        >
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuote.mutate(quote.id);
                            }}
                            title="Delete quote"
                            className="p-1.5 text-brand-muted hover:text-brand-danger transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
