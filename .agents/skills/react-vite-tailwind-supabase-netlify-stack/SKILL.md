---
name: react-vite-tailwind-supabase-netlify-stack
id: cmp97s6y503hv07advmxvy8y3
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# react-vite-tailwind-supabase-netlify-stack

> Production patterns for the React 19 + Vite + TypeScript + Tailwind + Supabase + Netlify stack. Covers project structure, state management with Context + reducers, Supabase RLS patterns, Netlify deploy previews, and dark-mode theming.

## When to use
(not specified)

## Documentation
# React + Vite + TypeScript + Tailwind + Supabase + Netlify Stack

## Overview

Production patterns from a SaaS app shipping on this stack. Covers the specific integration points and gotchas discovered across 30+ PRs.

## Project Structure

```
src/
├── components/
│   ├── calculator/          # Domain-specific components
│   ├── canvas/              # Canvas/drawing engine + components
│   ├── layout/              # Header, Footer, navigation
│   └── shared/              # Reusable UI components (ConfirmButton, etc.)
├── contexts/                # React Context providers
├── hooks/                   # Custom hooks (useBOM, useAutoCollapse, etc.)
├── lib/                     # Pure logic (validators, parsers, calculations)
├── pages/                   # Route-level page components
├── types/                   # TypeScript interfaces and type definitions
└── data/                    # Static data (seed JSON, colour maps, etc.)
```

## State Management: Context + Reducers

For complex configurators, use React Context with useReducer (not Redux, not Zustand — the built-in tools are sufficient for most SaaS apps):

```typescript
// FenceConfigContext.tsx
interface FenceState {
  runs: Run[];
  activeRunId: string | null;
  rightPaneView: "map" | "bom";
  // ...
}

type FenceAction =
  | { type: "ADD_RUN"; payload: Run }
  | { type: "UPDATE_SECTION"; runId: string; sectionId: string; changes: Partial<Section> }
  | { type: "SET_RIGHT_PANE"; view: "map" | "bom" }
  // ...

const fenceReducer = (state: FenceState, action: FenceAction): FenceState => {
  // Immutable updates with spread operators
};
```

### When to use Context vs prop drilling
- **Context:** state accessed by 3+ levels of components (global form state, user session, theme)
- **Props:** state used by parent → child → maybe grandchild (component-local state)
- **Don't over-contextualize:** a setting used by one component tree doesn't need Context

## Supabase Patterns

### Row-Level Security (RLS)
Every table gets RLS enabled. Policies use `auth.uid()` and a custom `auth.user_org_id()` function for multi-tenancy:

```sql
-- Users can only see their org's data
CREATE POLICY "org_isolation" ON quotes
  FOR ALL
  USING (org_id = auth.user_org_id());
```

### Edge Functions for BOM calculation
Heavy computation (BOM dispatch, pricing) runs in Supabase Edge Functions, not in the client:
- Client sends configuration → Edge Function → returns BOM result
- Keeps pricing logic server-side (can't be inspected/manipulated by client)
- Edge Functions use Deno runtime — TypeScript works but some Node APIs don't

## Netlify Deploy Previews

### How they work
- Every PR gets a deploy preview at `deploy-preview-{PR#}--{site-name}.netlify.app`
- The preview builds from the PR's HEAD commit
- Previews are the canonical verification target (not localhost)

### Common gotcha: draft PRs don't trigger builds
Some Netlify configurations only build on non-draft PRs. If the preview shows 404:
1. Check if the PR is still in draft state
2. Run `gh pr ready {PR#}` to mark it ready
3. Wait for the Netlify build to trigger

### Environment variables
Netlify deploy previews use the same env vars as production by default. To use different values for previews:
- Set them in Netlify UI under Site settings → Build & Deploy → Environment → Deploy Preview
- Or use `netlify.toml` context-specific settings:
  ```toml
  [context.deploy-preview.environment]
    VITE_API_URL = "https://preview-api.example.com"
  ```

## Tailwind + Dark Mode

### Semantic tokens via CSS custom properties
Don't hardcode Tailwind colours. Define semantic tokens:

```css
/* globals.css */
:root {
  --brand-primary: theme('colors.blue.600');
  --brand-bg: theme('colors.white');
  --brand-card: theme('colors.gray.50');
  --brand-text: theme('colors.gray.900');
  --brand-muted: theme('colors.gray.500');
}

.dark {
  --brand-primary: theme('colors.blue.400');
  --brand-bg: theme('colors.gray.950');
  --brand-card: theme('colors.gray.900');
  --brand-text: theme('colors.gray.100');
  --brand-muted: theme('colors.gray.400');
}
```

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--brand-primary)',
        'brand-bg': 'var(--brand-bg)',
        // ...
      }
    }
  }
}
```

Then use `bg-brand-bg`, `text-brand-text`, etc. in components. Theme changes automatically.

## Vite-Specific Notes

### Environment variables
Vite only exposes env vars prefixed with `VITE_`:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_KEY=AIza...
```

Access via `import.meta.env.VITE_SUPABASE_URL` (not `process.env`).

### Build verification
Always run `npm run build` before committing. Vite's dev server is more permissive than the production build — TypeScript errors and missing imports that work in dev will fail in build.

### Path aliases
Configure in both `vite.config.ts` and `tsconfig.json`:
```typescript
// vite.config.ts
resolve: {
  alias: { '@': path.resolve(__dirname, 'src') }
}
```

## Shared Component Patterns

### ConfirmButton (two-click safety)
```typescript
<ConfirmButton
  label="Clear Job"
  confirmLabel="Confirm Clear?"
  variant="danger"
  onConfirm={() => dispatch({ type: "CLEAR_JOB" })}
  timeout={3000}
/>
```

### SettingsDisclosureRow (label-left / value-right)
```typescript
<SettingsDisclosureRow
  label="Slat size"
  value={selectedSlat.label}
  isOpen={openDropdown === "slat"}
  onToggle={() => setOpenDropdown(openDropdown === "slat" ? null : "slat")}
>
  {/* Dropdown content */}
</SettingsDisclosureRow>
```

These are extracted as shared components used across all settings panels — not reimplemented per feature.

## Scripts
None
