# scripts/test-integration.sh

#!/usr/bin/env bash
set -e

if [ -f .env.local ]; then
  npx deno test \
    --allow-net \
    --allow-env \
    --allow-read \
    --env-file=.env.local \
    supabase/functions/bom-calculator/integration_tests.ts
else
  npx deno test \
    --allow-net \
    --allow-env \
    --allow-read \
    supabase/functions/bom-calculator/integration_tests.ts
fi