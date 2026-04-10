/**
 * Creates a Supabase Auth user via the Admin API (service role).
 *
 * Usage (from repo root, Node 20.6+):
 *   node --env-file=.env.local scripts/create-admin-user.mjs
 *
 * Required in env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_SEED_PASSWORD   — set explicitly (never commit)
 *
 * Optional:
 *   ADMIN_SEED_EMAIL (default: adminone@unimondo.com)
 *
 * After success, add the same email to ADMIN_EMAILS in .env.local (and production).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_SEED_EMAIL || "adminone@unimondo.com").trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;

if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Set ADMIN_SEED_PASSWORD (min 8 characters) when running this script.");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("createUser failed:", error.message);
  process.exit(1);
}

console.log("Created Auth user:", data.user?.email, data.user?.id);
console.log("Add to ADMIN_EMAILS in .env.local:", email);
