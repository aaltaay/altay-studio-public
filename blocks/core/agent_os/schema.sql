-- blocks/core/agent_os/schema.sql
-- Agentic OS Schema — Per-Tenant Agent Memory & Task Log
-- Run this into the tenant's schema (e.g. schema_slug) during provisioning.
-- Requires the `vector` extension to be enabled globally (see migrations/20260510000000_enable_pgvector.sql).

-- ══════════════════════════════════════════════════════════════════════════════
-- AGENT MEMORIES — Long-term semantic memory for the tenant's AI agent.
-- Each memory is a text snippet + embedding vector for similarity search.
-- Examples: "Sent welcome email to John about Botox inquiry on 2026-05-10"
--           "Owner prefers formal tone in all client communications"
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                    -- Human-readable memory text
  metadata JSONB DEFAULT '{}'::jsonb,       -- Structured tags: { type, lead_id, channel, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on metadata for filtering by type before vector search
CREATE INDEX IF NOT EXISTS idx_agent_memories_metadata
  ON agent_memories
  USING gin (metadata);

-- ══════════════════════════════════════════════════════════════════════════════
-- AGENT TASKS — Immutable log of every action the agent takes.
-- This is the audit trail. Every time the agent wakes up, reasons, and acts,
-- a task record is created with the full trace.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,               -- 'lead_insert', 'review_new', 'cron_daily', 'cron_weekly', 'missed_call', etc.
  trigger_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Raw webhook/event payload that woke the agent
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result JSONB DEFAULT '{}'::jsonb,         -- What the agent did: { action, to, subject, ... }
  llm_trace JSONB DEFAULT '[]'::jsonb,      -- Full ReAct conversation log for debugging
  error_message TEXT,                       -- If status = 'failed', the error details
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ                  -- NULL until status = 'completed' or 'failed'
);

-- Index for querying tasks by status (e.g. find all failed tasks)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
  ON agent_tasks (status);

-- Index for querying tasks by trigger type (e.g. all lead responses)
CREATE INDEX IF NOT EXISTS idx_agent_tasks_trigger_type
  ON agent_tasks (trigger_type);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- The agent-director Edge Function uses the service_role key (bypasses RLS).
-- Authenticated users (tenant admins) can READ tasks and memories for debugging.
-- No public/anon access.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Admins can view agent memories (read-only for transparency)
DROP POLICY IF EXISTS "Admins can view agent memories" ON agent_memories;
CREATE POLICY "Admins can view agent memories"
  ON agent_memories FOR SELECT
  TO authenticated
  USING (true);

-- Admins can view agent task logs (read-only audit trail)
DROP POLICY IF EXISTS "Admins can view agent tasks" ON agent_tasks;
CREATE POLICY "Admins can view agent tasks"
  ON agent_tasks FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access (for agent-director Edge Function)
DROP POLICY IF EXISTS "Service role full access memories" ON agent_memories;
CREATE POLICY "Service role full access memories"
  ON agent_memories FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access tasks" ON agent_tasks;
CREATE POLICY "Service role full access tasks"
  ON agent_tasks FOR ALL
  USING (true)
  WITH CHECK (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only the service_role (Edge Function) can write to these tables.
