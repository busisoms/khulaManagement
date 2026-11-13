import { db } from "@/lib/db";
import { createRecommendation, parseEvidence } from "@/lib/advisor";
import { formatEvidenceValue } from "@/lib/format";
import { startOfDay } from "@/lib/metrics";
import type { RecommendationView } from "@/components/RecommendationCard";

/**
 * The suggestion to show on Home. Makes a new one automatically unless the owner
 * already answered one today (approved or "not now") — then they can ask for another.
 */
export async function homeRecommendation(businessId: string): Promise<RecommendationView | null> {
  let rec = await db.recommendation.findFirst({ where: { businessId, status: "proposed" }, orderBy: { createdAt: "desc" } });
  if (!rec) {
    const answeredToday = await db.recommendation.count({ where: { businessId, createdAt: { gte: startOfDay(new Date()) } } });
    if (answeredToday > 0) return null;
    rec = await createRecommendation(businessId);
  }
  const ev = parseEvidence(rec.evidence);
  return {
    id: rec.id,
    title: ev.title || "Your next step",
    finding: rec.finding,
    why: ev.why,
    chips: ev.items.map((i) => ({ label: i.label, value: formatEvidenceValue(i.label, i.value) })),
    draftText: rec.draftText,
    actionType: rec.actionType,
    origin: rec.origin,
  };
}
