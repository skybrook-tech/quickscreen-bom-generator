// guard.js
//
// Safety guard for destructive / service-role operations (db seeding, RLS test).
// Refuses to run against a known PRODUCTION Supabase project unless explicitly
// overridden with ALLOW_PROD_DB=1.
//
// The seed + test scripts read SUPABASE_SERVICE_ROLE_KEY and write to whatever
// VITE_SUPABASE_URL points at. A stray prod URL in .env.local would otherwise
// let `npm run seed:products` / `seed:auth` / `test:rls` mutate production.

// Production Supabase project refs that must never be seeded/reset/tested.
// Add more refs here as prod projects are created.
export const PROD_SUPABASE_REFS = ['dsjtihvefcteftuxvowt'];

/**
 * Throw if `url` targets a production project, unless ALLOW_PROD_DB=1 is set.
 * @param {string|undefined} url   resolved Supabase URL (VITE_SUPABASE_URL)
 * @param {string} ctx             label for the error message, e.g. 'seed:products'
 */
export function assertNotProd(url, ctx = 'this operation') {
  if (!url) return;
  const matched = PROD_SUPABASE_REFS.find((ref) => url.includes(ref));
  if (matched && process.env.ALLOW_PROD_DB !== '1') {
    throw new Error(
      `\nREFUSING TO RUN ${ctx} against PRODUCTION Supabase project "${matched}".\n` +
        `  URL: ${url}\n` +
        `  This is a destructive / service-role operation.\n` +
        `  If you REALLY intend to target production, set ALLOW_PROD_DB=1 and re-run.\n`,
    );
  }
}
