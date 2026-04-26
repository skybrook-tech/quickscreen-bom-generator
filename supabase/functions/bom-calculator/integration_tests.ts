import { runFixtures } from "./fixture_runner.ts";

console.log("Checking for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY...");
console.log(Deno.env.get("SUPABASE_URL"));
console.log(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
if (Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
  console.log("Running fixtures...");
  await runFixtures();
}
