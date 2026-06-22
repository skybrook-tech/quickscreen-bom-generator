# QuickScreen BOM Generator

QuickScreen is a React, Vite, TypeScript, Tailwind, Supabase, and Netlify bill-of-materials generator for The Glass Outlet aluminium slat screening and gate systems.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The calculator runs at `http://localhost:5173`.

## Google Maps API key

The layout-map Google Maps plumbing reads `VITE_GOOGLE_MAPS_API_KEY` from `.env.local`. Create the key in [Google Cloud Console credentials](https://console.cloud.google.com/apis/credentials), then add it locally:

```env
VITE_GOOGLE_MAPS_API_KEY=your-browser-api-key
```

The key must have these APIs enabled:

- Maps JavaScript API
- Geocoding API

Restrict the key before sharing or deploying it:

- Application restriction: HTTP referrers
- Local referrers: `http://localhost:*/*`, `http://127.0.0.1:*/*`
- Netlify referrers: `https://*.netlify.app/*`
- Add the production domain when it is known

Set a daily quota cap and billing alert in Google Cloud so a broken preview or leaked key cannot run up unexpected usage. See [docs/google-maps-setup.md](docs/google-maps-setup.md) for the full repeatable setup checklist.

## Embeddable calculator (`/embed/:orgSlug`)

A supplier embeds their org-themed calculator with one tag:

```html
<script src="https://app.skybrook.com.au/embed.js" data-org="glass-outlet" defer></script>
```

`public/embed.js` injects an auto-resizing, chromeless iframe pointing at
`/embed/{org}`. The route is anonymous (no login) and renders only for orgs with
`embed_enabled = true`. Optional `data-height-mode="fixed"` disables auto-resize.

The host page receives `quickscreen:ready`, `quickscreen:resize`, and
`quickscreen:quote-created` (totals only — never line items or trade pricing) as
`window` `CustomEvent`s.

**⚠️ Google Maps referrer allowlist — first support call if missed.** The layout
map uses the same HTTP-referrer-restricted Maps key as the main app. Each
embedding supplier's domain(s) load the map from *their* origin, so every embed
domain **must be added to the Maps API key's HTTP-referrer allowlist** (alongside
the localhost/Netlify/production referrers above). Without it the map silently
fails to load on the supplier's site even though the rest of the calculator
works. Add, e.g., `https://*.theglassoutlet.com.au/*` when onboarding a supplier.

Each supplier's domains should also be listed in `organisations.embed_domains`
(advisory referrer check) — see brief 032.
