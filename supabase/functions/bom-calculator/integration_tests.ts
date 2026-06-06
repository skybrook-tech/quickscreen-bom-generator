import { runFixtures } from "./fixture_runner.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_SERVICE_ROLE_KEY length:", serviceRoleKey?.length ?? 0);
if (supabaseUrl && serviceRoleKey) {
  console.log("Running fixtures...");
  await runFixtures();
}

