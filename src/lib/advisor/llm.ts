/**
 * Provider-agnostic LLM adapter, configured by env vars:
 *   LLM_PROVIDER = "anthropic" (the only provider implemented)
 *   LLM_API_KEY  = provider API key. If missing, the app runs in demo mode (rule-based advisor).
 *   LLM_MODEL    = model id (default: claude-opus-5-5)
 *
 * Uses plain fetch against the Anthropic Messages API, so no SDK dependency is needed.
 * The model is asked for JSON matching ADVICE_JSON_SCHEMA (structured outputs).
 */
import { SYSTEM_PROMPT, userMessage } from "./prompt";

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

// JSON schema for structured outputs. Length limits etc. are enforced afterwards by Zod (schema.ts).
const ADVICE_JSON_SCHEMA = {
  type: "object",
  properties: {
    area: { type: "string", enum: ["profit", "payments", "reach", "stock", "loans"] },
    finding: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "number" } },
        required: ["label", "value"],
        additionalProperties: false,
      },
    },
    actionType: {
      type: "string",
      enum: ["payment_reminder", "promo_post", "stock_promotion", "expense_review", "loan_reminder", "record_more"],
    },
    actionTitle: { type: "string" },
    draftText: { type: "string" },
    why: { type: "string" },
    estimatedCostCents: { type: "integer" },
  },
  required: ["area", "finding", "evidence", "actionType", "actionTitle", "draftText", "why", "estimatedCostCents"],
  additionalProperties: false,
};

/** Ask the LLM for a recommendation. Returns the parsed JSON (unvalidated) or throws. */
export async function askLlm(factsJson: string): Promise<unknown> {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  if (provider !== "anthropic") throw new Error(`LLM_PROVIDER "${provider}" is not implemented`);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.LLM_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
      // If the model declines, the API retries on Anthropic's recommended fallback model.
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ADVICE_JSON_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(factsJson) }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const body = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (body.stop_reason === "refusal") throw new Error("LLM declined the request");
  const text = body.content?.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("LLM returned no text");
  return JSON.parse(text);
}
