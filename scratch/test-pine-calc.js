// scratch/test-pine-calc.js
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL in env");
  process.exit(1);
}

const payload = {
  "productCode": "DF_CCA_PAL",
  "schemaVersion": "v1",
  "variables": {
    "timber_type": "treated_pine",
    "paling_style": "butted",
    "post_spacing_mm": 2400,
    "paling_gap_mm": 0,
    "rail_profile": "75x38"
  },
  "runs": [
    {
      "runId": "run-test-1",
      "productCode": "DF_CCA_PAL",
      "variables": {
        "timber_type": "treated_pine",
        "paling_style": "butted",
        "post_spacing_mm": 2400,
        "paling_gap_mm": 0,
        "rail_profile": "75x38"
      },
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "segments": [
        {
          "segmentId": "seg-test-1",
          "sortOrder": 1,
          "kind": "fence",
          "segmentKind": "panel",
          "productCode": "DF_CCA_PAL",
          "segmentWidthMm": 12000,
          "targetHeightMm": 1200,
          "leftTermination": { "kind": "system" },
          "rightTermination": { "kind": "system" },
          "variables": {
            "target_height_mm": 1200
          }
        }
      ],
      "corners": []
    }
  ]
};

import { createClient } from '@supabase/supabase-js';

async function test() {
  const supabase = createClient(supabaseUrl, anonKey);
  console.log("Logging in as admin...");
  const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@glass-outlet.com',
    password: '123456',
  });

  if (loginError) {
    console.error("Login failed:", loginError.message);
    process.exit(1);
  }

  const jwt = authData.session?.access_token;
  const url = `${supabaseUrl}/functions/v1/bom-calculator`;
  console.log(`Calling ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({
      payload,
      pricingTier: 'tier1',
      supplierSlug: 'discount-fencing',
      debug: true
    })
  });

  const resText = await response.text();
  console.log(`Status: ${response.status}`);
  try {
    const data = JSON.parse(resText);
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(resText);
  }
}

test();
