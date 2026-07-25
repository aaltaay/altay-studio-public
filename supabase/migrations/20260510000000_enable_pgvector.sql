-- Enable pgvector extension for the Agentic OS memory system.
-- This only needs to run once on the master Supabase project.
-- Individual tenant schemas will use this extension for their agent_memories tables.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
