/**
 * provision-test-tenants.mjs
 *
 * Provisions three test tenants via the provision-client edge function
 * with different tenant_config payloads to validate multi-tenant pipeline.
 *
 * Usage: node scripts/provision-test-tenants.mjs
 *
 * Requires: SUPABASE_URL, SUPABASE_ANON_KEY in .env (loaded via dotenv)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config(); // load .env

const SUPABASE_URL = process.env.SUPABASE_URL || "https://[YOUR_SUPABASE_PROJECT_REF].supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_ANON_KEY is required in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Sign in as admin ──────────────────────────────────────────────────────────
console.log("🔑 Signing in as [YOUR_ADMIN_EMAIL]...");
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: "[YOUR_ADMIN_EMAIL]",
  password: "123456",
});

if (authError) {
  console.error("❌ Auth failed:", authError.message);
  process.exit(1);
}
console.log("✅ Authenticated as", authData.user.email);

// ── Tenant Definitions ────────────────────────────────────────────────────────
const tenants = [
  {
    label: "Tenant A — The Minimalist",
    payload: {
      business_name: "The Minimalist Barber",
      business_type: "barber",
      slug: "test-minimalist",
      primary_color: "#111827",
      owner_name: "Test Admin",
      owner_email: "[YOUR_ADMIN_EMAIL]",
      font_heading: "Inter",
      features: {
        booking_calendar: false,  // stress-test: this is "required" in registry
        gallery: false,
        staff_profiles: false,
        reviews: false,
        contact_form: false,
        promotions: false,
      },
    },
  },
  {
    label: "Tenant B — The Visual Studio",
    payload: {
      business_name: "The Visual Studio",
      business_type: "barber",
      slug: "test-visual",
      primary_color: "#4F46E5",
      owner_name: "Test Admin",
      owner_email: "[YOUR_ADMIN_EMAIL]",
      font_heading: "Playfair Display",
      features: {
        booking_calendar: false,
        gallery: true,
        staff_profiles: true,
        reviews: false,
        contact_form: true,
        promotions: false,
      },
    },
  },
  {
    label: "Tenant C — The Full Experience",
    payload: {
      business_name: "The Full Experience",
      business_type: "barber",
      slug: "test-full",
      primary_color: "#059669",
      owner_name: "Test Admin",
      owner_email: "[YOUR_ADMIN_EMAIL]",
      font_heading: "Outfit",
      features: {
        booking_calendar: true,
        gallery: true,
        staff_profiles: true,
        reviews: true,
        contact_form: true,
        promotions: true,
      },
    },
  },
];

// ── Provision each tenant sequentially ────────────────────────────────────────
const results = [];

for (const tenant of tenants) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🚀 Provisioning: ${tenant.label}`);
  console.log(`   Slug: ${tenant.payload.slug}`);
  console.log(`   Color: ${tenant.payload.primary_color}`);
  console.log(`   Font: ${tenant.payload.font_heading}`);
  console.log(`   Features: ${JSON.stringify(tenant.payload.features)}`);
  console.log(`${"═".repeat(60)}`);

  const startTime = Date.now();

  const { data, error } = await supabase.functions.invoke("provision-client", {
    body: tenant.payload,
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (error) {
    const errMsg = data?.error || error.message;
    console.error(`❌ FAILED [${elapsed}s]: ${errMsg}`);
    results.push({ slug: tenant.payload.slug, success: false, error: errMsg, elapsed });
  } else if (data?.success === false) {
    console.error(`❌ FAILED [${elapsed}s]: ${data.error}`);
    results.push({ slug: tenant.payload.slug, success: false, error: data.error, elapsed });
  } else {
    console.log(`✅ SUCCESS [${elapsed}s]`);
    console.log(`   Live URL: ${data.live_url}`);
    console.log(`   GitHub: ${data.github_repo}`);
    console.log(`   Steps: ${data.steps_completed?.join(" → ")}`);
    results.push({ slug: tenant.payload.slug, success: true, live_url: data.live_url, elapsed });
  }

  // Brief pause between provisions to avoid rate limits
  if (tenants.indexOf(tenant) < tenants.length - 1) {
    console.log("\n⏳ Waiting 5 seconds before next provision...");
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log("📊 PROVISIONING SUMMARY");
console.log(`${"═".repeat(60)}`);
for (const r of results) {
  const icon = r.success ? "✅" : "❌";
  const detail = r.success ? r.live_url : r.error;
  console.log(`  ${icon} ${r.slug} [${r.elapsed}s] → ${detail}`);
}
console.log(`${"═".repeat(60)}\n`);
