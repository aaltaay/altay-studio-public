// blocks/core/agent_os/engine.ts
// Shared TypeScript types for the Agentic OS.
// Used by the agent-director Edge Function and any future admin UI.

// ── Trigger Types ────────────────────────────────────────────────────────────
// Every event that can wake up the agent. Add new triggers here as use cases expand.
export type AgentTriggerType =
  | 'lead_insert'        // New lead submitted via form
  | 'lead_followup'      // CRON: lead hasn't been replied to in X hours
  | 'review_new'         // New Google Review detected
  | 'missed_call'        // Unanswered inbound call (via Twilio/VoIP webhook)
  | 'cron_daily'         // Daily operations briefing (7 AM)
  | 'cron_weekly'        // Weekly content syndication / marketing planning
  | 'booking_confirmed'  // Customer booked an appointment (upsell trigger)
  | 'reactivation'       // CRON: customer hasn't visited in X months
  | 'manual';            // Admin manually triggered the agent (for testing)

// ── Agent Memory ─────────────────────────────────────────────────────────────
export interface AgentMemory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];  // 1536-dim vector (not always returned from queries)
  created_at: string;
}

// ── Agent Task ───────────────────────────────────────────────────────────────
export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentTask {
  id: string;
  trigger_type: AgentTriggerType;
  trigger_payload: Record<string, unknown>;
  status: AgentTaskStatus;
  result: Record<string, unknown>;
  llm_trace: Array<{ role: string; content: string }>;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// ── Tool Definitions ─────────────────────────────────────────────────────────
// These are the tools that Claude can call during a ReAct loop.
// Each tool corresponds to a real action the agent can take.
export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// The base set of tools available to every agent regardless of business type.
export const BASE_TOOLS: AgentTool[] = [
  {
    name: 'send_email',
    description: 'Send a personalized email to a customer or lead. Use this to respond to inquiries, send follow-ups, or deliver promotions.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body in plain text or HTML' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'update_lead_status',
    description: 'Update the status of a lead in the CRM. Use this after contacting a lead to move them through the pipeline.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string', description: 'UUID of the lead to update' },
        status: { type: 'string', enum: ['new', 'contacted', 'resolved', 'archived'], description: 'New status for the lead' },
      },
      required: ['lead_id', 'status'],
    },
  },
  {
    name: 'store_memory',
    description: 'Save an important insight or fact to your long-term memory. Use this to remember customer preferences, past interactions, or business context for future reference.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The memory to store (human-readable summary)' },
        metadata: {
          type: 'object',
          description: 'Optional structured tags (e.g., { "type": "customer_preference", "lead_id": "..." })',
        },
      },
      required: ['content'],
    },
  },
];
