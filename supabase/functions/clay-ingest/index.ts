import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-clay-secret",
};

type ClayRow = Record<string, any>;

function read(row: ClayRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()] ?? row[key.replace(/\s+/g, "_").toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function readNumber(row: ClayRow, keys: string[]) {
  const raw = read(row, keys);
  if (!raw) return null;
  const num = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function inferSegment(row: ClayRow, fallback = "mep") {
  const text = [
    read(row, ["segment", "Segment"]),
    read(row, ["industry", "Industry"]),
    read(row, ["description", "Description", "Company Description"]),
    read(row, ["name", "Company", "Company Name"]),
  ].join(" ").toLowerCase();

  if (text.includes("commission")) return "cx";
  if (text.includes("contractor") || text.includes("construction")) return "bas";
  if (text.includes("real estate") || text.includes("property") || text.includes("owner")) return "owner";
  if (text.includes("energy") || text.includes("sustainability")) return "energy";
  if (text.includes("architecture") || text.includes("engineering") || text.includes("mep")) return "mep";
  return fallback;
}

function normalizeWebsite(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

function buildReason(row: ClayRow) {
  const explicit = read(row, ["why_this_account_matters", "why it matters", "Reasoning", "reasoning", "Account Fit"]);
  if (explicit) return explicit;

  const parts = [
    read(row, ["industry", "Industry"]),
    readNumber(row, ["employee_count", "Employees", "Headcount"]) ? `${readNumber(row, ["employee_count", "Employees", "Headcount"])} employees` : "",
    read(row, ["recent_news", "Recent News", "signal", "Signal"]),
    read(row, ["description", "Description", "Company Description"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.slice(0, 3).join(" · ") : "Imported from Clay for account-based prospecting.";
}

function mapRow(row: ClayRow, feed?: any) {
  const website = normalizeWebsite(read(row, ["website", "Website", "domain", "Domain", "Company Domain"]));
  const location = read(row, ["location", "Location", "headquarters", "Headquarters", "city", "City"]);
  const tierRaw = readNumber(row, ["tier", "Tier"]);
  
  // Use default tier from feed config if available
  const tier = feed?.tier_default || (tierRaw && [1, 2, 3].includes(tierRaw) ? tierRaw : 2);

  return {
    name: read(row, ["name", "Company", "Company Name", "organization_name"]) || website || "Unknown company",
    website,
    location,
    segment: feed?.segment || inferSegment(row),
    tier,
    status: "untouched",
    reasoning: buildReason(row),
    owner: read(row, ["owner", "Owner"]) || "Ahmi",
    source: "clay",
    feed_id: feed?.id || null,
    external_id: read(row, ["id", "Clay ID", "clay_id", "record_id"]),
    metadata: {
      clay: row,
      linkedin_url: read(row, ["linkedin_url", "LinkedIn", "Company LinkedIn"]),
      employee_count: readNumber(row, ["employee_count", "Employees", "Headcount"]),
      industry: read(row, ["industry", "Industry"]),
    },
    last_touched_at: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const feedId = url.searchParams.get("feed_id");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let feed: any = null;

  try {
    const globalSecret = Deno.env.get("CLAY_WEBHOOK_SECRET") ?? "";
    const receivedSecret = req.headers.get("x-clay-secret") ?? "";

    // Authenticate
    if (feedId) {
      const { data, error: feedErr } = await supabaseAdmin
        .schema("schema_crm")
        .from("research_feeds")
        .select("*")
        .eq("id", feedId)
        .single();

      if (feedErr || !data) {
        throw new Error(`Feed not found: ${feedId}`);
      }
      feed = data;

      if (feed.status === "paused") {
        throw new Error("Feed is paused");
      }

      // Check specific webhook secret or global secret
      if (receivedSecret !== feed.webhook_secret && receivedSecret !== globalSecret) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    } else {
      // Direct webhook authentication
      if (!globalSecret || receivedSecret !== globalSecret) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    }

    const body = await req.json();
    const rows = Array.isArray(body) ? body : Array.isArray(body.rows) ? body.rows : [body];
    const accounts = rows.map((row) => mapRow(row, feed)).filter((account) => account.name !== "Unknown company");

    const inserted: any[] = [];
    const skipped: any[] = [];

    for (const account of accounts) {
      let existingQuery = supabaseAdmin
        .schema("schema_crm")
        .from("target_accounts")
        .select("id,name")
        .limit(1);

      if (account.website) {
        existingQuery = existingQuery.eq("website", account.website);
      } else {
        existingQuery = existingQuery.eq("name", account.name);
      }

      const { data: existing } = await existingQuery;
      if (existing && existing.length > 0) {
        skipped.push({ name: account.name, reason: "duplicate" });
        continue;
      }

      const { data, error } = await supabaseAdmin
        .schema("schema_crm")
        .from("target_accounts")
        .insert(account)
        .select()
        .single();

      if (error) throw new Error(`Failed to insert ${account.name}: ${error.message}`);
      inserted.push(data);
    }

    // Update research feed stats if linked
    if (feed) {
      await supabaseAdmin
        .schema("schema_crm")
        .from("research_feeds")
        .update({
          last_run: new Date().toISOString(),
          imported_count: (feed.imported_count || 0) + inserted.length,
          status: "active",
          error_message: null,
        })
        .eq("id", feed.id);
    }

    return new Response(JSON.stringify({
      success: true,
      inserted: inserted.length,
      skipped: skipped.length,
      accounts: inserted.map((account) => ({ id: account.id, name: account.name, website: account.website })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    // If there was a feed, mark it as errored
    if (feed) {
      await supabaseAdmin
        .schema("schema_crm")
        .from("research_feeds")
        .update({
          status: "error",
          error_message: error.message,
        })
        .eq("id", feed.id);
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
