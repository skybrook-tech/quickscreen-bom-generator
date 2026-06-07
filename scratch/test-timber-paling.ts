import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function main() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const email = "test@glass-outlet.com";
  const password = Deno.env.get("TEST_USER_PASSWORD") ?? "123456";

  console.log(`Signing in as ${email}...`);
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.session) {
    throw new Error(`Failed to sign in as ${email}: ${authError?.message}`);
  }
  const jwt = authData.session.access_token;

  const payload = {
    "pricingTier": "tier1",
    "supplierSlug": "amazing-fencing",
    "payload": {
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
    }
  };

  console.log("Calling bom-calculator...");
  const res = await fetch(`${supabaseUrl}/functions/v1/bom-calculator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  console.log("Status:", res.status);
  console.log("Assumptions:", body.assumptions);
  console.log("Warnings:", body.warnings);
  console.log("Errors:", body.errors);
  console.log("Lines in BOM:");
  console.log(JSON.stringify(body.lines, null, 2));
}

main().catch(console.error);
