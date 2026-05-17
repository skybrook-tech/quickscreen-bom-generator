# Google Maps Setup

Use this checklist when creating or rotating the browser API key used by the QuickScreen layout-map workflow.

## 1. Select or create the Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select the project used for QuickScreen, or create a dedicated project for The Glass Outlet calculator.
3. Confirm billing is enabled for that project. Google Maps Platform requires billing even when usage stays inside the free monthly credit.

## 2. Enable required APIs

In **APIs & Services > Library**, enable:

- **Maps JavaScript API** — loads the browser map and geometry helpers.
- **Geocoding API** — supports address lookup and map calibration workflows.

## 3. Create the browser API key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Choose **Create credentials > API key**.
3. Rename the key to something clear, such as `QuickScreen Maps Browser Key`.
4. Copy the value into local `.env.local` as:

```env
VITE_GOOGLE_MAPS_API_KEY=your-browser-api-key
```

## 4. Restrict the key

Under **Application restrictions**, choose **HTTP referrers (web sites)**.

Add development referrers:

- `http://localhost:*/*`
- `http://127.0.0.1:*/*`

Add Netlify referrers:

- `https://*.netlify.app/*`

Add the production domain once it is confirmed.

Under **API restrictions**, choose **Restrict key** and allow only:

- Maps JavaScript API
- Geocoding API

## 5. Set quotas and alerts

1. In **APIs & Services > Enabled APIs & services**, open each enabled Maps API.
2. Set a conservative daily quota cap for early testing.
3. In **Billing > Budgets & alerts**, add a low budget alert for the project so usage spikes are caught quickly.

## 6. Deploy configuration

Add `VITE_GOOGLE_MAPS_API_KEY` to the Netlify site environment variables for any branch or deploy context that needs maps.

Do not commit real API keys. `.env.local` is ignored by git.

## 7. Local verification

After adding the key:

```bash
npm run typecheck
npm run test
```

The plumbing loader is intentionally UI-free. Later map UI work can import `useGoogleMaps()` from `src/hooks/useGoogleMaps.ts`.
