# Phase 7 — Polish

## Goal

Refine the dark UI theme, add loading states and error handling, improve responsiveness, and validate performance before launch.

## Steps

1. Dark theme refinement
2. Loading states, error boundaries, toast notifications
3. Responsive adjustments
4. Performance testing (canvas)
5. E2E testing of BOM calculation accuracy

## Dark Theme

The app uses a dark design language with:
- Dark background: `#0f1117`
- Card sections: `#1a1d2e` with subtle borders `#2a2d3e`
- Teal/cyan accent for interactive elements: `#3b82f6`
- Accordion sections for progressive disclosure (Layout → Config → Gates → Contact → BOM)
- SkybrookAI branding top-left, Glass Outlet logo top-right

Ensure consistency across all new components — no light-mode defaults leaking through from Tailwind base styles.

## Loading States

Add loading indicators for:
- BOM generation (edge function call — may take 1–2s)
- Quote save/load
- PDF generation
- Auth operations (login, signup)

Use Lucide React spinner icons or Tailwind `animate-pulse` skeleton screens where appropriate.

## Error Handling

- **React Error Boundaries**: wrap major sections (BOM display, canvas) so one crash doesn't take down the whole app
- **TanStack Query errors**: display inline error messages on failed BOM generation or quote save
- **Auth errors**: display field-level errors on login/signup forms
- **Edge function errors**: surface user-friendly messages (e.g. "BOM calculation failed — please check your inputs")
- **Form validation errors**: Zod errors surfaced via React Hook Form `formState.errors`

## Toast Notifications

Add toasts for:
- Quote saved successfully
- BOM copied to clipboard
- CSV downloaded
- Auth errors
- Edge function failures

## Responsive Adjustments

| Breakpoint | Behaviour |
|-----------|-----------|
| Mobile (`< md`) | Hide canvas section, form-only mode, BOM table horizontally scrollable |
| Tablet (`md–lg`) | Canvas visible but compact, accordion sections stack vertically |
| Desktop (`> lg`) | Full layout, side-by-side panels where applicable |

The canvas tool is not practical on mobile phones — hide it and let users enter run length manually.

## Performance

- **Canvas**: verify no memory leaks on mount/unmount (event listener cleanup in `destroy()`)
- **TanStack Query**: verify BOM result is cached and re-pricing (tier switch) doesn't re-trigger the edge function
- **React re-renders**: check that canvas engine updates do not cause unnecessary React re-renders
- **PDF generation**: `@react-pdf/renderer` can be slow for large BOMs — consider rendering in a web worker or on-demand only

## Security Checklist (Final Review)

- [ ] Repo moved to **private** on GitHub
- [ ] All BOM calculation logic in Supabase Edge Functions (never in client bundle)
- [ ] All pricing data in Supabase Postgres, accessed only via service role key
- [ ] `product_pricing` table has no RLS — `anon` and `authenticated` roles revoked
- [ ] Google Maps API key restricted to deployment domain(s)
- [ ] Supabase anon key only grants access to auth + quotes table (via RLS)
- [ ] No sensitive constants in client-side code (no margin %, no wholesale prices)
- [ ] Rate limiting on edge functions
- [ ] CORS configured to allow only deployment domain(s)
- [ ] Every RLS policy scopes by `org_id = auth.user_org_id()`
- [ ] Edge functions resolve `org_id` from JWT profile — never from client input
- [ ] `auth.user_org_id()` is `SECURITY DEFINER` and `STABLE`
- [ ] Quote inserts use `org_id` from user's profile, not from client

## E2E Test Run

Run the full Cypress suite against the production build:

```bash
npx cypress run --browser chrome
```

All 23 test cases (TC1–TC19, TC24–TC26) must pass. Pay particular attention to:
- **TC1 & TC5**: BOM accuracy (VERIFIED against Excel source of truth)
- **TC11–TC14**: Grand totals across all 3 pricing tiers
- **TC17–TC18**: System type switching (especially XPL → 65mm forced)
- **TC19**: Post count logic (wall termination, corners, gate posts)
- **TC24–TC26**: Edge cases

## Completion Criteria

- All Cypress tests pass on the production build
- No light-mode styling leaks
- Loading spinners appear during async operations
- Error boundaries catch and display errors gracefully
- Toast notifications work for all key user actions
- Mobile view hides canvas and is fully usable
- No console errors or memory leaks in dev tools
- Security checklist fully ticked off
