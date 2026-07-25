import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import * as postgres from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProvisionPayload {
  business_name: string;
  business_type: string;
  slug: string;
  primary_color: string;
  owner_name: string;
  owner_email: string;
  features?: Record<string, boolean>;  // Optional feature overrides from signup form
  font_heading?: string;               // Optional heading font override (e.g. "Playfair Display")
}

/** Build tenant_config JSON from feature selections and theme. */
function buildTenantConfig(
  features: Record<string, boolean>,
  primaryColor: string,
  fontHeading?: string
): Record<string, any> {
  // Convert flat { gallery: true } into structured { gallery: { enabled: true } }
  const structuredFeatures: Record<string, { enabled: boolean }> = {};
  for (const [key, enabled] of Object.entries(features)) {
    structuredFeatures[key] = { enabled };
  }
  // Mark booking_calendar as required (always)
  if (structuredFeatures.booking_calendar) {
    (structuredFeatures.booking_calendar as any).required = true;
  }

  // Build pages array from enabled features
  const featureToPage: Record<string, string> = {
    booking_calendar: "booking",
    gallery: "gallery",
    staff_profiles: "staff",
    reviews: "reviews",
    contact_form: "contact",
  };
  const pages = ["home"];
  for (const [key, enabled] of Object.entries(features)) {
    if (enabled && featureToPage[key]) {
      pages.push(featureToPage[key]);
    }
  }

  return {
    features: structuredFeatures,
    pages,
    theme: {
      primary_color: primaryColor,
      ...(fontHeading && { font_heading: fontHeading }),
    },
  };
}

/** Resolve which GitHub template repo to clone from based on business type. */
function getTemplateRepo(business_type: string): string {
  switch (business_type) {
    case "clinic":     return Deno.env.get("GITHUB_TEMPLATE_CLINIC") ?? "template-barber";
    case "barber":     return Deno.env.get("GITHUB_TEMPLATE_BARBER") ?? "template-barber";
    case "restaurant": return Deno.env.get("GITHUB_TEMPLATE_RESTAURANT") ?? "template-restaurant";
    case "bespoke":    return Deno.env.get("GITHUB_TEMPLATE_BESPOKE") ?? "template-bespoke";
    default:           return Deno.env.get("GITHUB_TEMPLATE_BARBER") ?? "template-barber";
  }
}

/** Resolve which Vercel framework preset to use based on business type. */
function getFramework(business_type: string): string {
  switch (business_type) {
    case "clinic":     return "vite";
    case "barber":     return "nextjs";
    case "restaurant": return "vite";
    case "bespoke":    return "vite";
    default:           return "nextjs";
  }
}

/** Sleep for ms milliseconds. */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

    let supabaseAdmin: any;
  let currentSlug: string | undefined;
  let businessId: string | null = null;
  let vercelProjectId: string | null = null;

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")              ?? "";
    const supabaseAnonKey  = Deno.env.get("SUPABASE_ANON_KEY")         ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const dbUrl            = Deno.env.get("SUPABASE_DB_URL")           ?? "";
    const githubToken      = Deno.env.get("GITHUB_TOKEN")              ?? "";
    const githubOrg        = Deno.env.get("GITHUB_ORG")                ?? "aaltaay";
    const vercelToken      = Deno.env.get("VERCEL_API_TOKEN")          ?? "";
    const vercelTeamId     = Deno.env.get("VERCEL_TEAM_ID")            ?? "";

    if (!dbUrl)        throw new Error("SUPABASE_DB_URL secret is missing");
    if (!githubToken)  throw new Error("GITHUB_TOKEN secret is missing");

    // ── 1. Verify Authentication ───────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized: " + (userError?.message ?? "User not found"));
    }

    const payload: ProvisionPayload = await req.json();
    const { business_name, business_type, slug, primary_color, owner_email, owner_name } = payload;

    const schema_name  = `schema_${slug.replace(/-/g, "_")}`;
    const newRepoName  = `${slug}-site`;                        // e.g. "ahmiclinic-site"
    const templateRepo = getTemplateRepo(business_type);        // e.g. "template-barber"
    const framework    = getFramework(business_type);           // e.g. "vite" or "nextjs"
    const liveUrl      = `https://${slug}.altaystudio.com`;
    
    currentSlug = slug;
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Build tenant config from feature selections
    // Always build a proper config even if no features were explicitly selected
    // (this ensures primary_color and font_heading are always injected)
    const featureOverrides = payload.features || {};
    const tenantConfig = buildTenantConfig(featureOverrides, primary_color, payload.font_heading);

    console.log(`Provisioning: ${business_name} | slug=${slug} | schema=${schema_name} | template=${templateRepo} → ${newRepoName} | features=${JSON.stringify(featureOverrides)}`);

    // ── 2. Insert business record into DB (INIT) ───────────────────────────
    const { data: businessData, error: insertError } = await supabaseAdmin.from("businesses").insert({
      owner_id:    user.id,
      business_name,
      business_type,
      owner_name,
      owner_email,
      slug,
      schema_name,
      primary_color,
      subdomain:    `${slug}.altaystudio.com`,
      provisioning_status: "in_progress",
      provisioning_step: "init",
      tenant_config: tenantConfig,
    }).select().single();

    if (insertError) {
      console.error("Error inserting business:", insertError);
      throw new Error("Failed to register business record: " + insertError.message);
    }
    businessId = businessData?.id || null;

    // ── 2. Create DB Schema ────────────────────────────────────────────────
    const pool = new postgres.Pool(dbUrl, 1, true);
    const connection = await pool.connect();
    try {
      await connection.queryObject(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);
      console.log(`Created schema: ${schema_name}`);

      const rawUrl = `https://raw.githubusercontent.com/${githubOrg}/${templateRepo}/master/supabase/schema.sql`;
      const schemaResponse = await fetch(rawUrl, {
        headers: { Authorization: `token ${githubToken}` },
      });
      if (!schemaResponse.ok) {
        console.warn(`Could not fetch schema.sql from ${rawUrl}: ${schemaResponse.statusText}`);
      } else {
        const schemaSql = await schemaResponse.text();
        if (schemaSql.trim().length > 0) {
          await connection.queryObject(`SET search_path TO "${schema_name}"`);
          try {
            await connection.queryObject(schemaSql);
            console.log("Executed template schema.sql successfully");

            // Expose the schema to PostgREST (CRITICAL: prevents 406 errors on the client)
            // We MUST query pg_db_role_setting for the authenticator role because current_setting()
            // will just return the session setting of the postgres user (null), which causes us
            // to overwrite and delete all other schemas from the API!
            const settingResult = await connection.queryObject<{ setting: string }>(`
              SELECT unnest(setconfig) AS setting 
              FROM pg_db_role_setting 
              JOIN pg_roles ON pg_db_role_setting.setrole = pg_roles.oid 
              WHERE pg_roles.rolname = 'authenticator'
            `);
            
            let currentSchemas = "public, storage, graphql_public";
            for (const row of settingResult.rows) {
              if (row.setting.startsWith("pgrst.db_schemas=")) {
                currentSchemas = row.setting.replace("pgrst.db_schemas=", "");
                break;
              }
            }

            if (!currentSchemas.includes(schema_name)) {
              const newSchemas = `${currentSchemas}, ${schema_name}`;
              await connection.queryObject(`ALTER ROLE authenticator SET pgrst.db_schemas = '${newSchemas}'`);
              await connection.queryObject(`NOTIFY pgrst, 'reload schema'`);
              console.log(`Exposed schema ${schema_name} to PostgREST`);
            }

            await supabaseAdmin.from("businesses").update({ provisioning_step: "db_schema" }).eq("slug", slug);

            // ── 2b. Inject Agent OS tables into the tenant schema ──────────────
            // Every tenant gets their own agent_memories (pgvector) and agent_tasks
            // tables for the Agentic OS. Fetched from the control plane repo.
            try {
              const agentOsUrl = `https://raw.githubusercontent.com/${githubOrg}/altay-studio/master/blocks/core/agent_os/schema.sql`;
              const agentOsResponse = await fetch(agentOsUrl, {
                headers: { Authorization: `token ${githubToken}` },
              });

              if (agentOsResponse.ok) {
                const agentOsSql = await agentOsResponse.text();
                if (agentOsSql.trim().length > 0) {
                  // search_path is already set to the tenant schema from above
                  await connection.queryObject(agentOsSql);
                  console.log(`Agent OS tables injected into ${schema_name}`);
                }
              } else {
                console.warn(`Could not fetch agent_os/schema.sql: ${agentOsResponse.statusText}`);
              }
            } catch (agentOsErr: any) {
              // Non-fatal: the site works without agent capabilities
              console.warn(`Agent OS injection failed (non-fatal): ${agentOsErr.message}`);
            }

          } catch (e: any) {
            console.error("Failed executing schema.sql:", e);
            throw new Error("Database schema execution failed: " + e.message);
          }
        }
      }
    } finally {
      connection.release();
      await pool.end();
    }

    // ── 3. Generate new GitHub repo from template ──────────────────────────
    // GitHub API: POST /repos/{template_owner}/{template_repo}/generate
    console.log(`Creating GitHub repo ${githubOrg}/${newRepoName} from template ${githubOrg}/${templateRepo}...`);
    const githubGenRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${templateRepo}/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: githubOrg,
          name: newRepoName,
          description: `${business_name} website — powered by Altay Studio`,
          private: true,
          include_all_branches: false,
        }),
      }
    );

    if (!githubGenRes.ok) {
      const errText = await githubGenRes.text();
      console.error(`GitHub repo generation failed (${githubGenRes.status}):`, errText);
      throw new Error(`GitHub repo generation failed (HTTP ${githubGenRes.status}): ${errText}`);
    }

    const githubData = await githubGenRes.json();
    console.log(`GitHub repo created: ${githubData.full_name}`);
    await supabaseAdmin.from("businesses").update({ 
      github_repo: `${githubOrg}/${newRepoName}`,
      provisioning_step: "github_repo" 
    }).eq("slug", slug);

    // Give GitHub a moment to initialize the repo before we modify it
    await sleep(3000);

    // ── 3b. Inject per-tenant config into the new repo ────────────────────
    // The template ships a default tenant.config.json — overwrite it with the
    // tenant-specific config so the build picks up correct colors/features/pages.
    console.log(`Injecting tenant.config.json into ${githubOrg}/${newRepoName}...`);
    
    // First, get the SHA of the existing tenant.config.json
    const existingConfigRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${newRepoName}/contents/tenant.config.json`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    
    let existingConfigSha: string | undefined;
    if (existingConfigRes.ok) {
      const existingConfig = await existingConfigRes.json();
      existingConfigSha = existingConfig.sha;
    }
    
    // Encode the tenant config as base64
    const configContent = JSON.stringify(tenantConfig, null, 2) + "\n";
    const configBase64 = btoa(configContent);
    
    const updateConfigRes = await fetch(
      `https://api.github.com/repos/${githubOrg}/${newRepoName}/contents/tenant.config.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `chore: inject tenant config for ${slug}`,
          content: configBase64,
          ...(existingConfigSha && { sha: existingConfigSha }),
        }),
      }
    );
    
    if (!updateConfigRes.ok) {
      const errText = await updateConfigRes.text();
      console.warn(`Failed to inject tenant.config.json (${updateConfigRes.status}):`, errText);
      // Non-fatal — env vars are the primary config source, file is secondary
    } else {
      console.log(`tenant.config.json injected successfully.`);
    }

    // ── 4. Create Vercel project linked to the NEW repo ────────────────────
    if (!vercelToken) {
      console.warn("VERCEL_API_TOKEN not set — skipping Vercel deployment");
    } else {
      console.log(`Creating Vercel project ${slug} → ${githubOrg}/${newRepoName}...`);

      const vercelApiUrl = vercelTeamId
        ? `https://api.vercel.com/v10/projects?teamId=${vercelTeamId}`
        : `https://api.vercel.com/v10/projects`;

      const vercelRes = await fetch(vercelApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: slug,
          framework: framework,
          gitRepository: {
            repo: `${githubOrg}/${newRepoName}`,   // ← NEW client repo, not the template
            type: "github",
          },
          environmentVariables: [
            // Legacy VITE_* env vars (backward compatibility)
            { key: "VITE_DB_SCHEMA",       value: schema_name,    target: ["production","preview","development"], type: "plain" },
            { key: "VITE_SUPABASE_URL",    value: supabaseUrl,    target: ["production","preview","development"], type: "plain" },
            { key: "VITE_SUPABASE_ANON_KEY", value: supabaseAnonKey, target: ["production","preview","development"], type: "plain" },
            { key: "VITE_PRIMARY_COLOR",   value: primary_color,  target: ["production","preview","development"], type: "plain" },
            { key: "VITE_BUSINESS_NAME",   value: business_name,  target: ["production","preview","development"], type: "plain" },
            { key: "VITE_TENANT_CONFIG",   value: JSON.stringify(tenantConfig), target: ["production","preview","development"], type: "plain" },
            // Next.js NEXT_PUBLIC_* env vars (Phase 3 architecture)
            { key: "NEXT_PUBLIC_DB_SCHEMA",       value: schema_name,    target: ["production","preview","development"], type: "plain" },
            { key: "NEXT_PUBLIC_SUPABASE_URL",    value: supabaseUrl,    target: ["production","preview","development"], type: "plain" },
            { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: supabaseAnonKey, target: ["production","preview","development"], type: "plain" },
            { key: "NEXT_PUBLIC_BUSINESS_NAME",   value: business_name,  target: ["production","preview","development"], type: "plain" },
            { key: "NEXT_PUBLIC_TENANT_CONFIG",   value: JSON.stringify(tenantConfig), target: ["production","preview","development"], type: "plain" },
            // NPM_TOKEN for GitHub Packages auth during builds
            { key: "NPM_TOKEN",            value: githubToken,    target: ["production","preview","development"], type: "encrypted" },
          ],
        }),
      });

      if (!vercelRes.ok) {
        const errText = await vercelRes.text();
        console.error(`Vercel API responded with ${vercelRes.status}:`, errText);
        // Rollback DB record and GitHub repo
        await supabaseAdmin.from("businesses").delete().eq("slug", slug);
        await fetch(`https://api.github.com/repos/${githubOrg}/${newRepoName}`, {
          method: "DELETE",
          headers: { Authorization: `token ${githubToken}`, "X-GitHub-Api-Version": "2022-11-28" },
        });
        throw new Error(`Vercel deployment failed (HTTP ${vercelRes.status}): ${errText}`);
      }

      const vercelData = await vercelRes.json();
      console.log(`Vercel project created: id=${vercelData.id}`);
      vercelProjectId = vercelData.id;
      await supabaseAdmin.from("businesses").update({ 
        vercel_project_id: vercelData.id,
        provisioning_step: "vercel_deploy" 
      }).eq("slug", slug);

      // 4b. Trigger initial deployment (since template generation doesn't fire a webhook)
      console.log(`Triggering initial Vercel deployment for project ${vercelData.id}...`);
      const deployApiUrl = vercelTeamId
        ? `https://api.vercel.com/v13/deployments?teamId=${vercelTeamId}`
        : `https://api.vercel.com/v13/deployments`;

      const deployRes = await fetch(deployApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: slug,
          project: vercelData.id,
          target: "production",
          gitSource: {
            type: "github",
            repoId: githubData.id,
            ref: githubData.default_branch || "main"
          }
        }),
      });

      if (!deployRes.ok) {
        const deployErr = await deployRes.text();
        console.warn(`Failed to trigger initial Vercel deployment (${deployRes.status}):`, deployErr);
        // We don't throw here because the project is successfully created, we just missed the first deploy.
      } else {
        console.log(`Initial deployment triggered successfully.`);
      }

      // 4c. Add custom domain to Vercel project
      console.log(`Adding custom domain ${slug}.altaystudio.com to Vercel project ${vercelData.id}...`);
      const domainApiUrl = vercelTeamId
        ? `https://api.vercel.com/v10/projects/${vercelData.id}/domains?teamId=${vercelTeamId}`
        : `https://api.vercel.com/v10/projects/${vercelData.id}/domains`;

      const domainRes = await fetch(domainApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${slug}.altaystudio.com`,
        }),
      });

      if (!domainRes.ok) {
        const domainErr = await domainRes.text();
        console.warn(`Failed to add custom domain to Vercel project (${domainRes.status}):`, domainErr);
      } else {
        console.log(`Custom domain added successfully.`);
      }

      // 4d. DNS is handled automatically by Cloudflare wildcard CNAME (*.altaystudio.com → cname.vercel-dns.com)
      // No per-client DNS API call needed — Vercel domain assignment above is sufficient.
      console.log(`DNS auto-resolved via Cloudflare wildcard for ${slug}.altaystudio.com`);

      // Persist Vercel project metadata back onto the business record
      await supabaseAdmin.from("businesses").update({
        vercel_project_id:      vercelData.id,
        vercel_deployment_url:  liveUrl,
        provisioning_status:    "completed",
        provisioning_step:      "done",
      }).eq("slug", slug);
    }

    return new Response(
      JSON.stringify({
        success: true,
        live_url:        liveUrl,
        github_repo:     `${githubOrg}/${newRepoName}`,
        business_id:     businessId,
        schema_name:     schema_name,
        vercel_project_id: vercelProjectId,
        subdomain:       `${slug}.altaystudio.com`,
        steps_completed: ["validate", "db_setup", "github_repo", "vercel_deploy", "dns_auto"],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Provisioning error:", error);

    if (supabaseAdmin && currentSlug) {
      await supabaseAdmin.from("businesses").update({
        provisioning_status: "failed",
        provisioning_error: error.message
      }).eq("slug", currentSlug);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
