import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import * as postgres from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
    const githubToken = Deno.env.get("GITHUB_TOKEN") ?? "";
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN") ?? "";
    const vercelTeamId = Deno.env.get("VERCEL_TEAM_ID") ?? "";

    // ── 1. Verify Authentication ───────────────────────────────────────────
    // Use the service role client for token verification — this is more reliable
    // than using the anon key client, since the service role can verify any JWT
    // regardless of RLS policies.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth verification failed:", userError?.message);
      throw new Error("Unauthorized: " + (userError?.message ?? "Invalid session token"));
    }

    // ── 2. Read Action Payload ─────────────────────────────────────────────
    const body = await req.json();
    const action = body.action;
    const project_id = body.project_id || body.business_id;
    
    const { data: project, error: projError } = await supabaseAdmin
      .schema("schema_crm")
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (projError || !project) {
      console.error("Project lookup failed:", projError?.message);
      throw new Error("Project not found: " + (projError?.message ?? "No project with that ID"));
    }

    const { name: slug, schema_name, github_repo, vercel_project_id } = project;

    // ── 3. Handle Actions ──────────────────────────────────────────────────
    if (action === "diagnose") {
      let schemaExists = false;
      let githubExists = false;
      let vercelExists = false;
      let errors: string[] = [];

      // Check Schema
      if (schema_name) {
        const pool = new postgres.Pool(dbUrl, 1, true);
        const connection = await pool.connect();
        try {
          const res = await connection.queryObject(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`, [schema_name]);
          schemaExists = res.rows.length > 0;
        } catch(e: any) {
          console.error("DB check error:", e);
          errors.push(`DB check failed: ${e.message}`);
        } finally {
          connection.release();
          await pool.end();
        }
      } else {
        errors.push("No schema_name configured on this project");
      }

      // Check GitHub
      if (github_repo) {
        try {
          const githubRes = await fetch(`https://api.github.com/repos/${github_repo}`, {
            headers: { Authorization: `token ${githubToken}` }
          });
          githubExists = githubRes.ok;
          if (!githubRes.ok) {
            errors.push(`GitHub repo ${github_repo} returned ${githubRes.status}`);
          }
        } catch(e: any) {
          errors.push(`GitHub API error: ${e.message}`);
        }
      } else {
        errors.push("No github_repo configured on this project");
      }

      // Check Vercel
      if (vercel_project_id) {
        try {
          const url = vercelTeamId ? `https://api.vercel.com/v9/projects/${vercel_project_id}?teamId=${vercelTeamId}` : `https://api.vercel.com/v9/projects/${vercel_project_id}`;
          const vercelRes = await fetch(url, {
            headers: { Authorization: `Bearer ${vercelToken}` }
          });
          vercelExists = vercelRes.ok;
          if (!vercelRes.ok) {
            errors.push(`Vercel project ${vercel_project_id} returned ${vercelRes.status}`);
          }
        } catch(e: any) {
          errors.push(`Vercel API error: ${e.message}`);
        }
      } else {
        errors.push("No vercel_project_id configured on this project");
      }

      return new Response(JSON.stringify({
        schema: schemaExists,
        github: githubExists,
        vercel: vercelExists,
        ...(errors.length > 0 && { warnings: errors })
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "cleanup") {
      // 1. Archive Schema
      if (schema_name) {
        const pool = new postgres.Pool(dbUrl, 1, true);
        const connection = await pool.connect();
        try {
          const ts = Date.now();
          const checkRes = await connection.queryObject(
            `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
            [schema_name]
          );
          if (checkRes.rows.length > 0) {
            await connection.queryObject(`ALTER SCHEMA "${schema_name}" RENAME TO "archived_${schema_name}_${ts}"`);
            console.log(`Renamed schema ${schema_name} to archived_${schema_name}_${ts}`);

            // Remove the renamed schema from PostgREST pgrst.db_schemas to avoid breaking DB API (503 Service Unavailable)
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

            if (currentSchemas.includes(schema_name)) {
              const cleanedSchemas = currentSchemas
                .split(",")
                .map((s: string) => s.trim())
                .filter((s: string) => s !== schema_name)
                .join(", ");
              
              await connection.queryObject(`ALTER ROLE authenticator SET pgrst.db_schemas = '${cleanedSchemas}'`);
              await connection.queryObject(`NOTIFY pgrst, 'reload schema'`);
              console.log(`Removed schema ${schema_name} from PostgREST db_schemas config`);
            }
          } else {
            console.log(`Schema ${schema_name} does not exist, skipping archival.`);
          }
        } catch(e: any) {
          console.error("Cleanup DB error:", e);
          throw new Error(`Database Schema archival failed: ${e.message}`);
        } finally {
          connection.release();
          await pool.end();
        }
      }

      // 2. Archive GitHub Repo
      if (github_repo) {
        const ts = Date.now();
        const repoName = github_repo.split('/')[1];
        const newRepoName = `archived-${ts}-${repoName}`;
        
        const ghRes = await fetch(`https://api.github.com/repos/${github_repo}`, {
          method: "PATCH",
          headers: { 
            Authorization: `token ${githubToken}`, 
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ name: newRepoName })
        });
        
        if (!ghRes.ok && ghRes.status !== 404) {
          const body = await ghRes.text();
          throw new Error(`GitHub Repo archival failed: ${ghRes.status} ${body}`);
        }
      }

      // 3. Delete Vercel Project
      if (vercel_project_id) {
        const url = vercelTeamId ? `https://api.vercel.com/v9/projects/${vercel_project_id}?teamId=${vercelTeamId}` : `https://api.vercel.com/v9/projects/${vercel_project_id}`;
        const vRes = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${vercelToken}` }
        });
        if (!vRes.ok && vRes.status !== 404) {
          const body = await vRes.text();
          throw new Error(`Vercel Project deletion failed: ${vRes.status} ${body}`);
        }
      }

      // 4. Delete Project Infrastructure Meta
      await supabaseAdmin.schema("schema_crm").from("projects").update({
        schema_name: null,
        github_repo: null,
        vercel_project_id: null,
        subdomain: null
      }).eq("id", project_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "agent_stats") {
      // Validate schema_name exists before querying tenant schema
      if (!schema_name) {
        throw new Error("Business not fully provisioned — no schema_name configured. Agent OS requires a provisioned database schema.");
      }

      // Query agent_tasks in the tenant's schema for today's usage
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: tasks, error: tasksError } = await supabaseAdmin
        .schema(schema_name)
        .from("agent_tasks")
        .select("result, created_at, status, trigger_type")
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error("Agent tasks query error:", tasksError);
        throw new Error(`Failed to query agent_tasks in ${schema_name}: ${tasksError.message}`);
      }

      // Also get all-time totals
      const { count: totalTasks } = await supabaseAdmin
        .schema(schema_name)
        .from("agent_tasks")
        .select("id", { count: "exact", head: true });

      let todayTokensIn = 0;
      let todayTokensOut = 0;
      let todayCost = 0;
      const todayTasks = tasks || [];

      for (const t of todayTasks) {
        const usage = t.result?.token_usage;
        if (usage) {
          todayTokensIn += usage.claude_input_tokens || 0;
          todayTokensOut += usage.claude_output_tokens || 0;
          todayCost += usage.estimated_cost_usd || 0;
        }
      }

      return new Response(JSON.stringify({
        today: {
          tasks: todayTasks.length,
          tokens_in: todayTokensIn,
          tokens_out: todayTokensOut,
          estimated_cost_usd: Math.round(todayCost * 10000) / 10000,
          recent: todayTasks.slice(0, 5).map(t => ({
            trigger: t.trigger_type,
            status: t.status,
            time: t.created_at,
          })),
        },
        all_time: {
          total_tasks: totalTasks || 0,
        },
        daily_limit: 50,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "resume") {
      throw new Error("Resume functionality is currently not fully supported via edge functions. Please use Force Cleanup and create the site again.");
    } else {
      throw new Error("Unknown action");
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
