// seed-auth.js
//
// Seeds test/admin auth users for every tenant org. Multi-org aware: add an
// entry to ORGS below to seed users for a new org.
//
// IMPORTANT: the handle_new_user trigger (on_auth_user_created) reads
// raw_user_meta_data (= user_metadata) for org_id, NOT app_metadata. Users
// created without user_metadata.org_id silently default to glass-outlet —
// that's why org_id MUST go in user_metadata here, and why we verify each
// profile actually landed in the intended org afterwards.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: `.env.${process.env.NODE_ENV || "local"}`, override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PASSWORD = "123456";

const ORGS = [
  {
    slug: "glass-outlet",
    name: "The Glass Outlet",
    users: [
      { email: "test@glass-outlet.com" },
      // Admin unlocks the v3 trace panel at /fence-calculator
      { email: "admin@glass-outlet.com", role: "admin" },
    ],
  },
  {
    slug: "amazing-fencing",
    name: "Amazing Fencing",
    users: [
      { email: "test@amazing-fencing.com" },
      { email: "admin@amazing-fencing.com", role: "admin" },
    ],
  },
];

async function resolveOrg({ slug, name }) {
  const { data: existing, error } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`org lookup (${slug}): ${error.message}`);
  if (existing) return existing;

  // organizations.sql normally creates orgs on db reset; this fallback keeps
  // the script usable against a database seeded another way.
  const { data: created, error: insertError } = await supabase
    .from("organisations")
    .insert({ name, slug })
    .select()
    .single();
  if (insertError) throw new Error(`org insert (${slug}): ${insertError.message}`);
  return created;
}

async function findUserByEmail(email) {
  // supabase-js admin API has no direct get-by-email; page through (tiny local sets).
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureUser(org, { email, role }) {
  let userId = null;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    // The signup trigger reads user_metadata (raw_user_meta_data) for org_id.
    user_metadata: { org_id: org.id },
    app_metadata: { org_id: org.id },
  });

  if (error) {
    if (error.code === "email_exists" || /already.*registered/i.test(error.message)) {
      const existing = await findUserByEmail(email);
      if (!existing) throw new Error(`${email}: createUser says exists but user not found`);
      userId = existing.id;
      console.log(`  ${email}: already exists`);
    } else {
      throw new Error(`createUser (${email}): ${error.message}`);
    }
  } else {
    userId = created.user.id;
    console.log(`  ${email}: created`);
  }

  // Wait for the signup trigger to create the profile row (fresh creates only,
  // but harmless on reruns).
  await new Promise((r) => setTimeout(r, 500));

  // Verify the profile landed in the intended org — fail loudly, do not let a
  // trigger default silently put this user in the wrong tenant.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(`profile lookup (${email}): ${profileError.message}`);
  if (!profile) throw new Error(`${email}: no profiles row created (signup trigger missing?)`);
  if (profile.org_id !== org.id) {
    throw new Error(
      `${email}: profile org_id ${profile.org_id} does not match intended org ${org.id} (${org.slug}) — check the handle_new_user trigger / user_metadata.org_id`,
    );
  }

  if (role && profile.role !== role) {
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (roleError) {
      throw new Error(
        `could not promote ${email} to role=${role}: ${roleError.message}\n` +
          `Run manually: UPDATE profiles SET role = '${role}' WHERE id = '${userId}';`,
      );
    }
    console.log(`  ${email}: promoted to role=${role}`);
  }
}

async function main() {
  for (const orgDef of ORGS) {
    const org = await resolveOrg(orgDef);
    console.log(`${orgDef.slug} (${org.id}):`);
    for (const user of orgDef.users) {
      await ensureUser({ ...org, slug: orgDef.slug }, user);
    }
  }
  console.log("\nSeed auth done.");
}

main().catch((e) => {
  console.error("\nSEED AUTH FAILED:", e.message);
  process.exit(1);
});
