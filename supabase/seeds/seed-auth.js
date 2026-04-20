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
  const { data: org } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", "glass-outlet")
    .single();

  if (!org) throw new Error("Org not found (did you run your SQL seed first?)");

  // ── Regular test user ────────────────────────────────────────────────────────
  await supabase.auth.admin.createUser({
    email: "test@glass-outlet.com",
    password: "123456",
    email_confirm: true,
    app_metadata: { org_id: org.id },
  });

  // ── Admin user (needed for v3 trace panel at /calculator) ───────────────────
  const { data: adminUserData } = await supabase.auth.admin.createUser({
    email: "admin@glass-outlet.com",
    password: "123456",
    email_confirm: true,
    app_metadata: { org_id: org.id },
  });

  // Wait for the signup trigger to create the profile row
  await new Promise((r) => setTimeout(r, 500));

  // Promote admin@glass-outlet.com to role = 'admin' using the user ID from createUser
  const adminId = adminUserData?.user?.id;
  if (adminId) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", adminId);
    if (error) {
      console.warn("Warning: could not promote admin user:", error.message);
      console.warn(`Run manually: UPDATE profiles SET role = 'admin' WHERE id = '${adminId}';`);
    } else {
      console.log("admin@glass-outlet.com promoted to role=admin");
    }
  } else {
    console.warn("Warning: admin user creation returned no user ID");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
