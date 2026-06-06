import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data: users, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  const adminUser = users.users.find(u => u.email === "admin@glass-outlet.com");
  const testUser = users.users.find(u => u.email === "test@glass-outlet.com");

  console.log("=== Auth Users ===");
  if (adminUser) console.log("admin@glass-outlet.com exists. ID:", adminUser.id);
  else console.log("admin@glass-outlet.com NOT found in auth");

  if (testUser) console.log("test@glass-outlet.com exists. ID:", testUser.id);
  else console.log("test@glass-outlet.com NOT found in auth");

  console.log("\n=== Profiles ===");
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("*");

  if (profileError) {
    console.error("Profile error:", profileError);
    return;
  }

  for (const p of profiles) {
    if (p.id === adminUser?.id) {
      console.log("Admin Profile:", p);
    }
    if (p.id === testUser?.id) {
      console.log("Test Profile:", p);
    }
  }
}

check();
