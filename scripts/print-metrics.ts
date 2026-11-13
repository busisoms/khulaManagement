// Prints the computed facts and growth score for every business (for hand-checking).
// Usage: npx tsx scripts/print-metrics.ts
import { db } from "@/lib/db";
import { loadBusinessData } from "@/lib/data";
import { computeFacts } from "@/lib/advisor/facts";
import { growthScore } from "@/lib/growth/score";

async function main() {
  for (const b of await db.business.findMany()) {
    const data = await loadBusinessData(b.id);
    const done = await db.action.count({ where: { businessId: b.id, status: "done" } });
    console.log(JSON.stringify({ facts: computeFacts(data), growth: growthScore(data, done) }, null, 2));
  }
}
main().finally(() => db.$disconnect());
