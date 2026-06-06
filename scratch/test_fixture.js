import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);
const { data, error } = await supabase.auth.signInWithPassword({
  email: "test@glass-outlet.com",
  password: "testuserpassword123" // wait, let's look up password or create one
});

console.log("Auth:", { data, error });

const jwt = data?.session?.access_token;
if (!jwt) {
  console.log("No session token. Trying with service role directly or auth token.");
}

const fixture = JSON.parse(readFileSync("supabase/seeds/glass-outlet/tests/simple/QSHS-10m-straight_base-plate.fixture.json", "utf8"));

const res = await fetch(`${supabaseUrl}/functions/v1/bom-calculator`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${jwt || serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(fixture.input),
});

const body = await res.json();
console.log("Status:", res.status);
console.log("Response:", JSON.stringify(body, null, 2));
