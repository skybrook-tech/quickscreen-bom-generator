// scratch/test-pine-summary.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

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

async function test() {
  const supabase = createClient(supabaseUrl, anonKey);
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

  const data = await response.json();
  
  console.log("=== CALCULATOR RESULTS SUMMARY ===");
  console.log("Status:", response.status);
  console.log("Pricing Tier Used:", data.pricingTier);
  console.log("\nWarnings:", data.warnings);
  console.log("\nAssumptions:", data.assumptions);
  console.log("\nErrors:", data.errors);
  
  console.log("\nLine Items:");
  if (data.lines) {
    data.lines.forEach(l => {
      console.log(`- SKU: ${l.sku.padEnd(25)} Qty: ${String(l.quantity).padStart(5)} Price: $${String(l.unitPrice).padStart(6)} Total: $${String(l.lineTotal).padStart(7)}  (${l.name})`);
    });
  }
  
  console.log("\nTotals:", data.totals);
}

test();
