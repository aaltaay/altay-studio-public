import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SearchPayload = {
  action?: "search_companies";
  query?: string;
  location?: string;
  segment?: string;
  page?: number;
  per_page?: number;
};

function normalizeLocation(org: any) {
  const parts = [
    org.city,
    org.state,
    org.country,
  ].filter(Boolean);
  return parts.join(", ") || org.raw_address || org.location || "";
}

function inferSegment(org: any, fallback = "mep") {
  const text = [
    org.industry,
    org.short_description,
    org.name,
    org.keywords?.join(" "),
  ].filter(Boolean).join(" ").toLowerCase();

  if (text.includes("commission")) return "cx";
  if (text.includes("contractor") || text.includes("construction")) return "bas";
  if (text.includes("real estate") || text.includes("property")) return "owner";
  if (text.includes("energy") || text.includes("sustainability")) return "energy";
  if (text.includes("architecture") || text.includes("engineering") || text.includes("mep")) return "mep";
  return fallback;
}

function accountReason(org: any) {
  const facts = [
    org.industry,
    org.estimated_num_employees ? `${org.estimated_num_employees} employees` : "",
    org.annual_revenue ? `annual revenue ${org.annual_revenue}` : "",
    org.short_description,
  ].filter(Boolean);

  return facts.length > 0
    ? facts.slice(0, 3).join(" · ")
    : "Imported from Apollo for account-based prospecting.";
}

function mapApolloOrganization(org: any, segment: string) {
  const domain = org.primary_domain || org.website_url || org.domain || "";
  const website = domain && !domain.startsWith("http") ? domain : domain.replace(/^https?:\/\//, "").replace(/^www\./, "");

  return {
    external_id: org.id,
    name: org.name || org.organization_name || website || "Unknown company",
    website,
    location: normalizeLocation(org),
    segment: inferSegment(org, segment),
    reasoning: accountReason(org),
    source: "apollo",
    metadata: {
      apollo_id: org.id,
      linkedin_url: org.linkedin_url,
      industry: org.industry,
      employee_count: org.estimated_num_employees,
      annual_revenue: org.annual_revenue,
      phone: org.phone,
      raw: org,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const apolloApiKey = Deno.env.get("APOLLO_API_KEY") ?? "";

    if (!apolloApiKey) {
      throw new Error("Missing APOLLO_API_KEY secret. Add it in Supabase Function secrets before searching Apollo.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized: " + (userError?.message ?? "Invalid session token"));
    }

    const body: SearchPayload = await req.json();
    const action = body.action || "search_companies";
    if (action !== "search_companies") throw new Error("Unsupported Apollo action");

    const query = (body.query || "").trim();
    if (!query) throw new Error("Search query is required");

    const perPage = Math.min(Math.max(Number(body.per_page || 10), 1), 25);
    const page = Math.max(Number(body.page || 1), 1);
    const segment = body.segment || "mep";
    const keywords = [query, body.location].filter(Boolean).join(" ");

    const apolloRes = await fetch("https://api.apollo.io/api/v1/mixed_companies/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apolloApiKey,
      },
      body: JSON.stringify({
        q_keywords: keywords,
        page,
        per_page: perPage,
      }),
    });

    const text = await apolloRes.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!apolloRes.ok) {
      throw new Error(`Apollo search failed (${apolloRes.status}): ${json.error || json.message || text}`);
    }

    const organizations = json.organizations || json.accounts || json.companies || [];
    const candidates = organizations.map((org: any) => mapApolloOrganization(org, segment));

    return new Response(JSON.stringify({
      success: true,
      source: "apollo",
      query,
      page,
      per_page: perPage,
      total: json.pagination?.total_entries || json.num_fetch_result || candidates.length,
      candidates,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
