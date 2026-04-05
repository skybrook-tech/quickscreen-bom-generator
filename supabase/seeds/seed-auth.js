// seed-auth.ts
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}` });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Example: get org id from your existing SQL-seeded table

  const { data: org } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", "glass-outlet")
    .single();

  if (!org) throw new Error("Org not found (did you run your SQL seed first?)");

  await supabase.auth.admin.createUser({
    email: "test@glass-outlet.com",
    password: "123456",
    email_confirm: true, // ✅ local dev convenience
    app_metadata: { org_id: org.id }, // optional
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
