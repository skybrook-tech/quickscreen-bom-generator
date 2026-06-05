import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const payload = {
  "productCode": "AF_COLORBOND",
  "schemaVersion": "v1",
  "variables": {
    "colour": "Monument"
  },
  "runs": [
    {
      "runId": "run-amazing-colorbond-1",
      "productCode": "AF_COLORBOND",
      "variables": {
        "mounting_type": "concreted-in-ground",
        "max_panel_width_mm": 2365
      },
      "leftBoundary": { "type": "product_post" },
      "rightBoundary": { "type": "product_post" },
      "segments": [
        {
          "segmentId": "seg-amazing-colorbond-1",
          "sortOrder": 1,
          "kind": "fence",
          "segmentKind": "panel",
          "productCode": "AF_COLORBOND",
          "segmentWidthMm": 30000,
          "targetHeightMm": 1800,
          "leftTermination": { "kind": "system" },
          "rightTermination": { "kind": "system" },
          "variables": {
            "target_height_mm": 1800
          }
        },
        {
          "segmentId": "seg-amazing-gate-1",
          "sortOrder": 2,
          "kind": "gate",
          "segmentKind": "gate",
          "productCode": "QS_GATE",
          "segmentWidthMm": 1000,
          "targetHeightMm": 1800,
          "leftTermination": { "kind": "system" },
          "rightTermination": { "kind": "system" },
          "variables": {
            "colour": "Monument",
            "gate_height_mm": 1800,
            "gate_width_mm": 1000
          }
        }
      ],
      "corners": []
    }
  ]
};

async function test() {
  const supabase = createClient(supabaseUrl, anonKey);
  console.log("Logging in...");
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
  console.log(`Calling ${url} with supplierSlug: 'amazing-fencing'...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({
      payload,
      pricingTier: 'tier2',
      supplierSlug: 'amazing-fencing',
      debug: true
    })
  });

  const resText = await response.text();
  console.log(`Status: ${response.status}`);
  try {
    const data = JSON.parse(resText);
    if (data.errors && data.errors.length > 0) {
      console.error("Calculations returned errors:", data.errors);
    }
    if (data.warnings && data.warnings.length > 0) {
      console.warn("Calculations returned warnings:", data.warnings);
    }
    
    console.log("-----------------------------------------");
    console.log("LINE ITEMS:");
    let totalEx = 0;
    if (data.lines) {
      data.lines.forEach((line) => {
        const lineTotal = line.lineTotal || (line.quantity * line.unitPrice);
        totalEx += lineTotal;
        console.log(`- ${line.name} (${line.sku}): Qty ${line.quantity} @ $${line.unitPrice.toFixed(2)} = $${lineTotal.toFixed(2)}`);
      });
    }
    console.log("-----------------------------------------");
    console.log(`Calculated Subtotal Ex GST: $${totalEx.toFixed(2)} (Expected: $1226.86)`);
    const gst = totalEx * 0.10;
    console.log(`Calculated GST: $${gst.toFixed(2)} (Expected: $122.69)`);
    console.log(`Calculated Total Inc GST: $${(totalEx + gst).toFixed(2)} (Expected: $1349.55)`);
    
  } catch (err) {
    console.log("Failed to parse JSON response:", err);
    console.log(resText);
  }
}

test();
