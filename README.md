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
