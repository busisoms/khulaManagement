import { AdviceSchema, type Advice } from "./schema";
import { numbersInFacts, type Facts } from "./facts";

/** Allowed difference when matching a cited number to the facts (rands, days, counts). */
export const EVIDENCE_TOLERANCE = 1;

/** Numbers written inside an evidence string, e.g. "R1 470 over 41 days" -> [1470, 41]. */
export function numbersInText(text: string): number[] {
  const matches = text.replace(/(\d)[ ,](?=\d{3}\b)/g, "$1").match(/-?\d+(\.\d+)?/g) ?? [];
  return matches.map(Number);
}

/** Every number the advice cites must appear in the facts (within the tolerance). */
export function findInventedNumbers(advice: Advice, facts: Facts): number[] {
  const known = numbersInFacts(facts);
  const cited = advice.evidence.flatMap((e) => (typeof e.value === "number" ? [e.value] : numbersInText(e.value)));
  return cited.filter((n) => !known.some((k) => Math.abs(k - n) <= EVIDENCE_TOLERANCE));
}

export type ValidationResult = { ok: true; advice: Advice } | { ok: false; reason: string };

/** Schema check + evidence check + budget check. */
export function validateAdvice(raw: unknown, facts: Facts): ValidationResult {
  const parsed = AdviceSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: `schema: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}` };
  const advice = parsed.data;
  const invented = findInventedNumbers(advice, facts);
  if (invented.length > 0) return { ok: false, reason: `evidence not in facts: ${invented.join(", ")}` };
  const budgetCents = Math.round(facts.business.monthlyBudgetRands * 100);
  if (advice.estimatedCostCents > 0 && advice.estimatedCostCents > budgetCents) {
    return { ok: false, reason: `cost ${advice.estimatedCostCents} over budget ${budgetCents}` };
  }
  return { ok: true, advice };
}
