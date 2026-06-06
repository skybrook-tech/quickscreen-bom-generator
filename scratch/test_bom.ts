import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://pmgfbvpiozvpezmtqhuz.supabase.co";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZ2ZidnBpb3p2cGV6bXRxaHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1ODg3MiwiZXhwIjoyMDk1NjM0ODcyfQ.P0Egv8s0o9sOI2YKQLsmMjbFkhFz1I14QdoT85tl_No";
const email = "test@glass-outlet.com";
const password = "123456";

const supabase = createClient(supabaseUrl, serviceRoleKey);
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !authData.session) {
  console.error("Auth failed:", authError);
  Deno.exit(1);
}

const payload = {
  "productCode": "AF_TIMBER_PALING",
  "schemaVersion": "v2",
  "variables": {
    "timber_type": "hardwood",
    "paling_style": "lapped_capped",
    "max_panel_width_mm": 2400,
    "paling_gap_mm": 0,
    "rail_profile": "75x38"
  },
  "runs": [
    {
      "runId": "run-001",
      "segments": [
        {
          "segmentId": "seg-001",
          "sortOrder": 0,
          "kind": "fence",
          "productCode": "AF_TIMBER_PALING",
          "segmentWidthMm": 30000,
          "targetHeightMm": 1800,
          "leftTermination": { "kind": "system" },
          "rightTermination": { "kind": "system" }
        }
      ]
    }
  ]
};

const res = await fetch(`${supabaseUrl}/functions/v1/bom-calculator`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${authData.session.access_token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ pricingTier: "tier1", payload }),
});

const body = await res.json();
console.log("STATUS:", res.status);
console.log("LINES:", JSON.stringify(body.lines, null, 2));
console.log("WARNINGS:", body.warnings);
console.log("ERRORS:", body.errors);
console.log("ASSUMPTIONS:", body.assumptions);
