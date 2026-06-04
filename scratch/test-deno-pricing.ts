import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load .env.local manually
const envText = await Deno.readTextFile(".env.local");
for (const line of envText.split("\n")) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#")) continue;
  const idx = clean.indexOf("=");
  if (idx === -1) continue;
  const key = clean.slice(0, idx).trim();
  const val = clean.slice(idx + 1).trim();
  Deno.env.set(key, val);
}

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: org } = await supabaseAdmin.from('organisations').select('*').eq('slug', 'glass-outlet').single();
  console.log("Org ID:", org.id);

  const { data, error } = await supabaseAdmin
    .from("pricing_rules_with_sku")
    .select("sku, price, rule, priority")
    .eq("org_id", org.id)
    .eq("tier_code", "tier1")
    .eq("active", true)
    .ilike("sku", "DF-%");

  if (error) {
    console.error("Deno query failed:", error);
  } else {
    console.log(`Deno found ${data?.length} pricing rules:`);
    console.log(data);
  }
}

await main();
