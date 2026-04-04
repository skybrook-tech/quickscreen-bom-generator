# Phase 5 — Quotes & Export

## Goal

Enable saving and loading quotes to Supabase, and exporting BOMs via CSV, PDF, clipboard, and print.

## Steps

1. Implement save/load quotes (Supabase DB + TanStack Query)
2. Build `SavedQuotesList`
3. Implement CSV export (Papaparse)
4. Implement PDF export (@react-pdf/renderer)
5. Implement clipboard copy
6. Build print stylesheet

## Components to Build

| Component | Description |
|-----------|-------------|
| `QuoteActions.tsx` | Print, CSV, Copy, Save buttons |
| `SavedQuotesList.tsx` | Sidebar/modal of saved quotes |
| `QuotePDFTemplate.tsx` | @react-pdf/renderer template |

## TanStack Query Hook

```typescript
// src/hooks/useQuotes.ts
export function useQuotes() {
  const quotesQuery = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedQuote[];
    },
  });

  const saveQuote = useMutation({
    mutationFn: async (quote) => {
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  return { quotesQuery, saveQuote };
}
```

## Saved Quote Data Model

```typescript
export interface SavedQuote {
  id: string;
  orgId: string;
  userId: string;
  customerRef: string;
  fenceConfig: FenceConfig;
  gates: GateConfig[];
  bom: BOMResult;
  contact: ContactInfo;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

## Quote RLS Rules

- Users can **view** all quotes in their org (staff need cross-user visibility)
- Users can only **insert/update/delete** their own quotes
- `org_id` on insert must come from the user's profile — not client input
- Quotes are stored in Supabase Postgres as JSONB columns

## Export Formats

### CSV (Papaparse)
- Export all BOM line items: SKU, description, quantity, unit, unit price, line total
- Include grand total row
- Filename: `quote-{customerRef}-{date}.csv`

### PDF (@react-pdf/renderer)
- JSX-based template in `QuotePDFTemplate.tsx`
- Include: customer ref, date, fence config summary, gate summaries, BOM table, totals
- Branding: SkybrookAI + Glass Outlet logo

### Clipboard Copy
- Copy BOM as tab-separated text (paste into Excel/Sheets)

### Print
- Print stylesheet via CSS `@media print`
- Hide UI chrome, show BOM table and totals only

## Quote Statuses

| Status | Meaning |
|--------|---------|
| `draft` | In progress, not sent |
| `sent` | Sent to customer |
| `accepted` | Customer accepted |
| `expired` | Quote expired |

## Completion Criteria

- Users can save a generated BOM as a named quote
- Saved quotes list shows all org quotes (not just the current user's)
- Loading a quote repopulates fence config, gates, and BOM display
- CSV export downloads correctly
- PDF export generates a printable document
- Clipboard copy produces pasteable text
- Print view is clean and quote-only
