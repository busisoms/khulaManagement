import { db } from "@/lib/db";
import { loadBusinessData } from "@/lib/data";
import { computeFacts, type Facts } from "./facts";
import { askLlm, llmConfigured } from "./llm";
import { ruleBasedAdvice } from "./rules";
import type { Advice } from "./schema";
import { validateAdvice } from "./validate";

export { llmConfigured } from "./llm";
export type { Advice } from "./schema";

/** Computed facts for a business (the only business data the LLM sees). */
export async function buildFacts(businessId: string, now = new Date()): Promise<Facts> {
  return computeFacts(await loadBusinessData(businessId), now);
}

export type AdviceResult = { advice: Advice; origin: "llm" | "rules"; note?: string };

/**
 * LLM advice when configured: parse + validate, retry once, then fall back to the rules.
 * `ask` is injectable so tests can simulate LLM answers.
 */
export async function getAdvice(facts: Facts, ask: (factsJson: string) => Promise<unknown> = askLlm): Promise<AdviceResult> {
  if (ask === askLlm && !llmConfigured()) return { advice: ruleBasedAdvice(facts), origin: "rules", note: "demo mode" };

  const factsJson = JSON.stringify(facts);
  let lastReason = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = validateAdvice(await ask(factsJson), facts);
      if (result.ok) return { advice: result.advice, origin: "llm" };
      lastReason = result.reason;
      // An invented number is not a formatting slip: don't retry, fall back straight away.
      if (result.reason.startsWith("evidence")) break;
    } catch (e) {
      lastReason = e instanceof Error ? e.message : String(e);
    }
  }
  console.warn(`[advisor] LLM advice rejected, using rules: ${lastReason}`);
  return { advice: ruleBasedAdvice(facts), origin: "rules", note: lastReason };
}

/** The current proposed recommendation, creating one if there is none. */
export async function currentRecommendation(businessId: string) {
  const existing = await db.recommendation.findFirst({
    where: { businessId, status: "proposed" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return createRecommendation(businessId);
}

export async function createRecommendation(businessId: string) {
  const { advice, origin } = await getAdvice(await buildFacts(businessId));
  return db.recommendation.create({
    data: {
      businessId,
      area: advice.area,
      finding: advice.finding,
      // Title, why and cost travel with the evidence so the card can show them.
      evidence: JSON.stringify({ items: advice.evidence, title: advice.actionTitle, why: advice.why, costCents: advice.estimatedCostCents }),
      actionType: advice.actionType,
      draftText: advice.draftText,
      origin,
      status: "proposed",
    },
  });
}

export type StoredEvidence = { items: { label: string; value: number | string }[]; title: string; why: string; costCents: number };

export function parseEvidence(json: string): StoredEvidence {
  const parsed = JSON.parse(json);
  // The seeded historic recommendation stores a bare list.
  if (Array.isArray(parsed)) return { items: parsed, title: "", why: "", costCents: 0 };
  return parsed;
}
