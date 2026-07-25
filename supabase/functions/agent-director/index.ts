// supabase/functions/agent-director/index.ts
// ══════════════════════════════════════════════════════════════════════════════
// AGENT DIRECTOR — The brain of the Agentic OS.
// 
// This Edge Function is the centralized ReAct loop that powers every tenant's
// autonomous AI agent. It receives webhook/cron events, resolves the tenant,
// queries memories, reasons with Claude 3.5 Sonnet, executes tools, and logs
// the full trace.
//
// Architecture:
//   RECEIVE → RESOLVE TENANT → RECALL (memories) → REASON (Claude) → ACT → RECORD
// ══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import * as postgres from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Cost Controls ────────────────────────────────────────────────────────────
// Max agent invocations per tenant per day. Prevents runaway costs from
// high-volume forms or webhook loops. Adjust per pricing tier.
const DAILY_TASK_LIMIT = 50;

// Approximate cost per token (USD) for logging/alerting purposes
const CLAUDE_INPUT_COST_PER_TOKEN = 0.000003;   // $3/M input tokens
const CLAUDE_OUTPUT_COST_PER_TOKEN = 0.000015;   // $15/M output tokens
const EMBEDDING_COST_PER_TOKEN = 0.00000002;     // $0.02/M tokens

interface TokenUsage {
  claude_input_tokens: number;
  claude_output_tokens: number;
  embedding_tokens: number;
  estimated_cost_usd: number;
}

// ── Types ────────────────────────────────────────────────────────────────────

type AgentTriggerType =
  | "lead_insert"
  | "lead_followup"
  | "review_new"
  | "missed_call"
  | "cron_daily"
  | "cron_weekly"
  | "reactivation"
  | "chat_message"
  | "manual";

interface AgentDirectorPayload {
  trigger_type: AgentTriggerType;
  slug: string;                          // Tenant slug (e.g. "ahmiclinic")
  data: Record<string, unknown>;         // Trigger-specific data (e.g. the new lead row)
}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

interface ClaudeContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ── Tool Definitions ─────────────────────────────────────────────────────────

const AGENT_TOOLS: ClaudeTool[] = [
  {
    name: "send_email",
    description:
      "Send a personalized email to a customer or lead. Use this to respond to inquiries, send follow-ups, or deliver promotions.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: {
          type: "string",
          description: "Email body in plain text or HTML",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "update_lead_status",
    description:
      "Update the status of a lead in the CRM. Use this after contacting a lead to move them through the pipeline.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID of the lead to update" },
        status: {
          type: "string",
          enum: ["new", "contacted", "resolved", "archived"],
          description: "New status for the lead",
        },
      },
      required: ["lead_id", "status"],
    },
  },
  {
    name: "store_memory",
    description:
      "Save an important insight or fact to your long-term memory. Use this to remember customer preferences, past interactions, or business context for future reference.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The memory to store (human-readable summary)",
        },
        metadata: {
          type: "object",
          description:
            'Optional structured tags (e.g., { "type": "customer_preference", "lead_id": "..." })',
        },
      },
      required: ["content"],
    },
  },
  {
    name: "send_chat_reply",
    description:
      "Send a response to a user in a live chat session on the website.",
    input_schema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "UUID of the chat session" },
        message: {
          type: "string",
          description: "The response message to send to the user",
        },
      },
      required: ["session_id", "message"],
    },
  },
];

// ── Tool Executors ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: {
    tenantClient: ReturnType<typeof createClient>;
    schemaName: string;
    slug: string;
    resendApiKey: string;
    openaiApiKey: string;
    businessName: string;
    dbUrl: string;
  }
): Promise<{ success: boolean; result: string }> {
  switch (toolName) {
    // ── send_email ─────────────────────────────────────────────────────────
    case "send_email": {
      const { to, subject, body } = toolInput as {
        to: string;
        subject: string;
        body: string;
      };

      if (!context.resendApiKey) {
        return { success: false, result: "RESEND_API_KEY not configured" };
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${context.businessName} <noreply@altaystudio.com>`,
          to: [to],
          subject,
          html: body,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, result: `Resend error (${res.status}): ${errText}` };
      }

      const resData = await res.json();
      return { success: true, result: `Email sent. ID: ${resData.id}` };
    }

    // ── update_lead_status ─────────────────────────────────────────────────
    case "update_lead_status": {
      const { lead_id, status } = toolInput as {
        lead_id: string;
        status: string;
      };

      const { error } = await context.tenantClient
        .schema(context.schemaName)
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", lead_id);

      if (error) {
        return { success: false, result: `DB error: ${error.message}` };
      }
      return { success: true, result: `Lead ${lead_id} status → ${status}` };
    }

    // ── store_memory ───────────────────────────────────────────────────────
    case "store_memory": {
      const { content, metadata } = toolInput as {
        content: string;
        metadata?: Record<string, unknown>;
      };

      // Generate embedding for the memory
      let embedding: number[] | null = null;
      if (context.openaiApiKey) {
        try {
          const embRes = await fetch(
            "https://api.openai.com/v1/embeddings",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${context.openaiApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: content,
              }),
            }
          );
          if (embRes.ok) {
            const embData = await embRes.json();
            embedding = embData.data?.[0]?.embedding ?? null;
          }
        } catch (e) {
          console.warn("Failed to generate embedding:", e);
        }
      }

      const insertPayload: Record<string, unknown> = {
        content,
        metadata: metadata || {},
      };

      const { data: memoryRow, error } = await context.tenantClient
        .schema(context.schemaName)
        .from("agent_memories")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error || !memoryRow) {
        return { success: false, result: `DB error: ${error.message}` };
      }

      if (embedding && context.dbUrl) {
        try {
          const client = new postgres.Client(context.dbUrl);
          await client.connect();
          await client.queryArray`
            INSERT INTO agent_internal.embeddings (tenant_slug, memory_id, embedding)
            VALUES (${context.slug}, ${memoryRow.id}, ${JSON.stringify(embedding)})
          `;
          await client.end();
        } catch (e: any) {
          console.warn("Failed to insert embedding directly:", e);
        }
      }

      return { success: true, result: `Memory stored: "${content.substring(0, 80)}..."` };
    }

    // ── send_chat_reply ────────────────────────────────────────────────────
    case "send_chat_reply": {
      const { session_id, message } = toolInput as {
        session_id: string;
        message: string;
      };

      // Fetch the current transcript
      const { data: session, error: fetchError } = await context.tenantClient
        .schema(context.schemaName)
        .from("chat_sessions")
        .select("transcript")
        .eq("id", session_id)
        .single();

      if (fetchError || !session) {
        return { success: false, result: `DB error: ${fetchError?.message || "Session not found"}` };
      }

      // Append assistant message
      const transcript = session.transcript || [];
      transcript.push({ role: "assistant", content: message });

      // Update the row (this triggers Realtime so the user sees the message)
      const { error: updateError } = await context.tenantClient
        .schema(context.schemaName)
        .from("chat_sessions")
        .update({ transcript, updated_at: new Date().toISOString() })
        .eq("id", session_id);

      if (updateError) {
        return { success: false, result: `DB error on update: ${updateError.message}` };
      }

      return { success: true, result: `Reply sent successfully to session ${session_id}.` };
    }

    default:
      return { success: false, result: `Unknown tool: ${toolName}` };
  }
}

// ── Memory Recall ────────────────────────────────────────────────────────────

async function recallMemories(
  tenantClient: ReturnType<typeof createClient>,
  schemaName: string,
  slug: string,
  openaiApiKey: string,
  dbUrl: string,
  contextText: string,
  limit: number = 5
): Promise<string[]> {
  if (!openaiApiKey || !dbUrl) return [];

  try {
    // Generate embedding for the context
    const embRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: contextText,
      }),
    });

    if (!embRes.ok) return [];
    const embData = await embRes.json();
    const queryEmbedding = embData.data?.[0]?.embedding;
    if (!queryEmbedding) return [];

    // Perform vector similarity search via direct Postgres connection
    const client = new postgres.Client(dbUrl);
    await client.connect();
    
    const result = await client.queryObject<{ memory_id: string }>`
      SELECT memory_id
      FROM agent_internal.embeddings
      WHERE tenant_slug = ${slug}
      ORDER BY embedding <-> ${JSON.stringify(queryEmbedding)}
      LIMIT ${limit}
    `;
    await client.end();

    const memoryIds = result.rows.map(r => r.memory_id);

    if (memoryIds.length === 0) return [];

    const { data, error } = await tenantClient
      .schema(schemaName)
      .from("agent_memories")
      .select("content")
      .in("id", memoryIds);

    if (error || !data) return [];
    return data.map((row: { content: string }) => row.content);
  } catch (e) {
    console.warn("Memory recall failed:", e);
    return [];
  }
}

// ── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  businessName: string,
  businessType: string,
  tenantConfig: Record<string, unknown>,
  memories: string[]
): string {
  const memoriesBlock =
    memories.length > 0
      ? `## Your Recent Memories\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : "## Your Recent Memories\nNo memories yet. This is your first interaction for this business.";

  const businessTypeAddendum = getBusinessTypeAddendum(businessType);

  return `You are the AI operations assistant for ${businessName}, a ${businessType} business.

Your job is to act as a proactive Digital Employee. You work behind the scenes — customers never interact with you directly. You receive events (new leads, missed calls, reviews, scheduled tasks) and take autonomous action to grow the business.

## Your Personality
- Professional but warm. You represent a real local business.
- Brief and action-oriented. Do not write essays.
- Use the business name naturally in communications.

## Your Rules
1. ALWAYS use the tools available to you. Never just respond with text — take action.
2. After every action, store a memory summarizing what you did and why.
3. If you don't have enough information to act, store a memory noting the gap.
4. Never fabricate information about the business (services, prices, hours). If you don't know, say so politely.

${businessTypeAddendum}

## Business Configuration
${JSON.stringify(tenantConfig, null, 2)}

${memoriesBlock}`;
}

function getBusinessTypeAddendum(businessType: string): string {
  switch (businessType) {
    case "barber":
      return `## Business Type: Barber/Salon
Your tone is friendly and direct. You handle a high volume of casual, repeat customers.
Common actions: respond quickly to booking inquiries, send "time for a haircut" reminders, follow up on no-shows.`;

    case "clinic":
      return `## Business Type: Clinic / Medical Spa
Your tone is professional and reassuring. You handle sensitive medical inquiries.
CRITICAL: Never provide medical advice. Never mention specific treatments or pricing unless they are in the business config.
Common actions: respond to consultation inquiries, follow up on treatment quotes, request Google Reviews after appointments.`;

    case "restaurant":
      return `## Business Type: Restaurant
Your tone is warm and hospitable. You handle reservations, online orders, and event inquiries.
Common actions: confirm reservations, follow up on catering inquiries, promote daily specials.`;

    case "bespoke":
    default:
      return `## Business Type: General
You are a general-purpose assistant. Adapt your tone and actions based on the business config provided.`;
  }
}

// ── Claude ReAct Loop ────────────────────────────────────────────────────────

async function runReActLoop(
  systemPrompt: string,
  userMessage: string,
  tools: ClaudeTool[],
  toolContext: {
    tenantClient: ReturnType<typeof createClient>;
    schemaName: string;
    slug: string;
    resendApiKey: string;
    openaiApiKey: string;
    businessName: string;
    dbUrl: string;
  },
  anthropicApiKey: string,
  maxIterations: number = 5
): Promise<{ trace: ClaudeMessage[]; finalText: string; tokenUsage: TokenUsage }> {
  const tokenUsage: TokenUsage = {
    claude_input_tokens: 0,
    claude_output_tokens: 0,
    embedding_tokens: 0,
    estimated_cost_usd: 0,
  };
  const messages: ClaudeMessage[] = [
    { role: "user", content: userMessage },
  ];

  let finalText = "";

  for (let i = 0; i < maxIterations; i++) {
    // Call Claude
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText}`);
    }

    const claudeResponse = await res.json();
    const contentBlocks: ClaudeContentBlock[] = claudeResponse.content || [];

    // Track token usage from this Claude call
    if (claudeResponse.usage) {
      tokenUsage.claude_input_tokens += claudeResponse.usage.input_tokens || 0;
      tokenUsage.claude_output_tokens += claudeResponse.usage.output_tokens || 0;
    }

    // Add assistant response to conversation
    messages.push({ role: "assistant", content: contentBlocks });

    // Check if Claude wants to use tools
    const toolUseBlocks = contentBlocks.filter(
      (b: ClaudeContentBlock) => b.type === "tool_use"
    );

    // Extract any text response
    const textBlocks = contentBlocks.filter(
      (b: ClaudeContentBlock) => b.type === "text"
    );
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b: ClaudeContentBlock) => b.text).join("\n");
    }

    // If no tool use, the loop is done
    if (toolUseBlocks.length === 0 || claudeResponse.stop_reason === "end_turn") {
      break;
    }

    // Execute each tool and feed results back
    const toolResults: ClaudeContentBlock[] = [];
    for (const toolBlock of toolUseBlocks) {
      console.log(`Executing tool: ${toolBlock.name}`, toolBlock.input);

      const { success, result } = await executeTool(
        toolBlock.name!,
        toolBlock.input as Record<string, unknown>,
        toolContext
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result,
        is_error: !success,
      });
    }

    // Add tool results as user message (Anthropic API format)
    messages.push({ role: "user", content: toolResults });
  }

  // Calculate estimated cost
  tokenUsage.estimated_cost_usd =
    (tokenUsage.claude_input_tokens * CLAUDE_INPUT_COST_PER_TOKEN) +
    (tokenUsage.claude_output_tokens * CLAUDE_OUTPUT_COST_PER_TOKEN) +
    (tokenUsage.embedding_tokens * EMBEDDING_COST_PER_TOKEN);

  console.log(`[agent-director] Token usage: ${tokenUsage.claude_input_tokens} in / ${tokenUsage.claude_output_tokens} out | Est. cost: $${tokenUsage.estimated_cost_usd.toFixed(4)}`);

  return { trace: messages, finalText, tokenUsage };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const dbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";

  if (!anthropicApiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: AgentDirectorPayload = await req.json();
    const { trigger_type, slug, data } = payload;

    console.log(`[agent-director] Trigger: ${trigger_type} | Tenant: ${slug}`);

    // ── 1. RESOLVE TENANT ──────────────────────────────────────────────────
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const schemaName = `schema_${slug.replace(/-/g, "_")}`;

    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .select("business_name, business_type, tenant_config")
      .eq("slug", slug)
      .single();

    if (bizError || !business) {
      throw new Error(`Tenant not found for slug "${slug}": ${bizError?.message}`);
    }

    const { business_name, business_type, tenant_config } = business;

    // ── RATE LIMIT CHECK ───────────────────────────────────────────────────
    // Count how many tasks have run for this tenant today to prevent cost overruns.
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseAdmin
      .schema(schemaName)
      .from("agent_tasks")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString());

    if (todayCount !== null && todayCount >= DAILY_TASK_LIMIT) {
      console.warn(`[agent-director] Rate limit reached for ${slug}: ${todayCount}/${DAILY_TASK_LIMIT} tasks today`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Daily agent limit reached (${DAILY_TASK_LIMIT}/day). Task skipped.`,
          tasks_today: todayCount,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. CREATE TASK RECORD ──────────────────────────────────────────────
    const { data: task, error: taskError } = await supabaseAdmin
      .schema(schemaName)
      .from("agent_tasks")
      .insert({
        trigger_type,
        trigger_payload: data,
        status: "running",
      })
      .select("id")
      .single();

    if (taskError) {
      console.error("Failed to create task record:", taskError);
      // Non-fatal — continue without task tracking
    }

    // ── 3. RECALL MEMORIES ─────────────────────────────────────────────────
    const contextText = `Trigger: ${trigger_type}. Data: ${JSON.stringify(data)}`;
    const memories = await recallMemories(
      supabaseAdmin,
      schemaName,
      slug,
      openaiApiKey,
      dbUrl,
      contextText
    );

    // ── 4. BUILD PROMPT & RUN REACT LOOP ───────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      business_name,
      business_type,
      tenant_config || {},
      memories
    );

    const userMessage = buildUserMessage(trigger_type, data);

    const { trace, finalText, tokenUsage } = await runReActLoop(
      systemPrompt,
      userMessage,
      AGENT_TOOLS,
      {
        tenantClient: supabaseAdmin,
        schemaName,
        slug,
        resendApiKey,
        openaiApiKey,
        businessName: business_name,
        dbUrl,
      },
      anthropicApiKey
    );

    // ── 5. RECORD TASK COMPLETION ──────────────────────────────────────────
    if (task?.id) {
      await supabaseAdmin
        .schema(schemaName)
        .from("agent_tasks")
        .update({
          status: "completed",
          result: {
            summary: finalText,
            token_usage: tokenUsage,
          },
          llm_trace: trace,
          completed_at: new Date().toISOString(),
        })
        .eq("id", task.id);
    }

    console.log(`[agent-director] Completed: ${trigger_type} for ${slug}`);

    return new Response(
      JSON.stringify({
        success: true,
        trigger_type,
        slug,
        task_id: task?.id,
        summary: finalText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[agent-director] Error:", error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ── User Message Builder ─────────────────────────────────────────────────────
// Converts a trigger + data into a natural language prompt for Claude.

function buildUserMessage(
  triggerType: AgentTriggerType,
  data: Record<string, unknown>
): string {
  switch (triggerType) {
    case "lead_insert":
      return `A new lead just submitted a form on the website.

Lead details:
- Name: ${data.name || "Unknown"}
- Email: ${data.email || "Not provided"}
- Phone: ${data.phone || "Not provided"}
- Message: "${data.message || "No message"}"
- Submitted at: ${data.created_at || new Date().toISOString()}

Your job: Send them a personalized, warm response within seconds. Then update their lead status to "contacted" and store a memory of this interaction.`;

    case "lead_followup":
      return `A lead has not been responded to within the expected timeframe.

Lead details:
- Name: ${data.name || "Unknown"}
- Email: ${data.email || "Not provided"}
- Original message: "${data.message || "No message"}"
- Originally submitted: ${data.created_at || "Unknown"}
- Current status: ${data.status || "Unknown"}

Your job: Send a polite follow-up email. Store a memory of this follow-up.`;

    case "missed_call":
      return `An inbound call was missed (went to voicemail).

Caller details:
- Phone: ${data.phone || "Unknown"}
- Call time: ${data.call_time || new Date().toISOString()}

Your job: Send an immediate text-back via SMS to engage the caller before they call a competitor.`;

    case "review_new":
      return `A new Google Review was posted for the business.

Review details:
- Reviewer: ${data.reviewer_name || "Anonymous"}
- Rating: ${data.rating || "Unknown"}/5
- Review text: "${data.review_text || "No text"}"

Your job: If 4-5 stars, write a grateful, SEO-rich reply. If 1-2 stars, draft a de-escalation response and alert the owner. Store a memory.`;

    case "chat_message": {
      const transcript = Array.isArray(data.transcript) ? data.transcript : [];
      // Grab the last 5 messages for context
      const recentMessages = transcript.slice(-5).map((m: any) => `${m.role === 'user' ? 'User' : 'You'}: ${m.content}`).join("\n");
      
      return `A user just sent a message in the website's live chat.
      
Session ID: ${data.id}

Recent chat history:
${recentMessages}

Your job: Provide a helpful, concise response to the user. You MUST use the \`send_chat_reply\` tool to respond. Do not reply with regular text.`;
    }

    case "cron_daily":
      return `It's time for the daily operations briefing.

Current data:
${JSON.stringify(data, null, 2)}

Your job: Compile a brief summary of yesterday's activity and send it to the business owner via email.`;

    case "cron_weekly":
      return `It's time for the weekly planning review.

Current data:
${JSON.stringify(data, null, 2)}

Your job: Analyze the business performance and suggest actions for the upcoming week.`;

    case "manual":
      return `The business admin has manually triggered you for testing.

Data provided:
${JSON.stringify(data, null, 2)}

Your job: Acknowledge the test and demonstrate your capabilities by storing a memory of this test run.`;

    default:
      return `You received a "${triggerType}" event with this data:\n${JSON.stringify(data, null, 2)}\n\nTake the most appropriate action.`;
  }
}
