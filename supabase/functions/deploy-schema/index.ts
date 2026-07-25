import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";
    if (!dbUrl) throw new Error("SUPABASE_DB_URL secret is missing");

    const payload = await req.json();
    const { schema_name, sql } = payload;

    const pool = new postgres.Pool(dbUrl, 1, true);
    const connection = await pool.connect();
    try {
      await connection.queryObject(`SET search_path TO "${schema_name}"`);
      await connection.queryObject(sql);
      
      // Also inject Agent OS tables since this bespoke site needs them too
      const agentOsSql = `
        CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
        
        CREATE TABLE IF NOT EXISTS agent_memories (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          content text NOT NULL,
          embedding vector(1536),
          metadata jsonb DEFAULT '{}'::jsonb,
          created_at timestamptz DEFAULT now()
        );
        
        CREATE TABLE IF NOT EXISTS agent_tasks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          action text NOT NULL,
          payload jsonb DEFAULT '{}'::jsonb,
          status text DEFAULT 'pending',
          result text,
          created_at timestamptz DEFAULT now()
        );
      `;
      await connection.queryObject(agentOsSql);

    } finally {
      connection.release();
      await pool.end();
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
