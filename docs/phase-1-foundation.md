# Phase 1 — Foundation

## Goal

Scaffold the React application, connect to Supabase (local dev), implement authentication, set up the database schema, and establish the main layout shell.

## Steps

1. Scaffold Vite + React + Tailwind + React Router
2. Set up Supabase project (local dev with `supabase init` + `supabase start`)
3. Implement auth (login, signup, session management, AuthGuard)
4. Create database migrations
5. Build `AppShell`, `Header`, basic routing

## Package Installation

```bash
# Core
npm create vite@latest quickscreen-bom -- --template react-ts
cd quickscreen-bom

# UI & Styling
npm i tailwindcss @tailwindcss/vite

# Supabase
npm i @supabase/supabase-js

# State & Data
npm i @tanstack/react-query react-hook-form @hookform/resolvers zod

# Export
npm i @react-pdf/renderer papaparse

# Routing & UI
npm i react-router-dom lucide-react

# Dev
npm i -D @types/react @types/react-dom typescript
```

## Database Migrations

Create in order:

| File | Purpose |
|------|---------|
| `001_create_organisations.sql` | Organisations table + seed Glass Outlet org |
| `002_create_profiles.sql` | Profiles table, `auth.user_org_id()` helper, signup trigger |
| `003_create_quotes.sql` | Quotes table with RLS policies |
| `004_create_pricing.sql` | Product pricing table (no RLS — service role only) |
| `005_create_products.sql` | Top-level product table — fence systems and gate products (no RLS) |
| `006_create_product_components.sql` | Component catalog — individual SKUs/hardware (no RLS — service role only) |

### Key Multi-Tenancy Rules

- Every table has an `org_id` column
- All RLS policies use `auth.user_org_id()` — never inline JOINs
- `auth.user_org_id()` is `SECURITY DEFINER` and `STABLE`
- `product_pricing`, `products`, and `product_components` tables have **no RLS** — revoke all access from `anon` and `authenticated` roles
- Edge functions access pricing via service role key only
- For v1, default all new users to the Glass Outlet org

### Multi-Tenancy Note

For v1 there is only one org ("The Glass Outlet") but the schema must support multiple. Adding `org_id` columns and RLS policies now avoids a painful migration later.

## Auth Flow

- Email/password via Supabase Auth
- `AuthGuard` component redirects unauthenticated users to `/login`
- Signup passes `org_id` in user metadata (defaults to Glass Outlet org in the trigger)
- Session management via `useAuth` hook
- `auth.user_org_id()` resolves the current user's org from their profile in all RLS policies

## Routing

| Route | Component | Auth |
|-------|-----------|------|
| `/login` | `LoginPage` | Public |
| `/signup` | `SignUpPage` | Public |
| `/` | `MainApp` | Protected |
| `/quotes/:id` | `QuoteViewPage` | Protected |

## Tailwind Theme

```typescript
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f1117',
          card: '#1a1d2e',
          border: '#2a2d3e',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
          muted: '#6b7280',
          text: '#e5e7eb',
        },
      },
    },
  },
};
```

## Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

## Completion Criteria

- App runs locally with `npm run dev` (Vite on port 5173)
- Legacy HTML app served with `npm run serve:html` (port 3000)
- All 6 migrations written under `supabase/migrations/`
- Login and signup pages functional (requires Supabase project — see `.env.local.example`)
- Authenticated users can reach the main app, unauthenticated users are redirected
- `AppShell` and `Header` render with correct branding (SkybrookAI + Glass Outlet)
- `tsc -p tsconfig.app.json --noEmit` passes with zero errors
