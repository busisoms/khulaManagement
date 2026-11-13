/**
 * Growth tree score. Pure and tested.
 *
 * BUSINESS RULES (change here):
 * - Baseline = the first full 4-week period with at least BASELINE_MIN_COVERAGE_DAYS days of records.
 *   We look at 4-week windows starting on the first record's day, moving forward a week at a time.
 * - Score = % change of the owner's goal metric over the latest 4 weeks vs the baseline.
 * - Stages: seed (no baseline) · sprout (< 0%) · sapling (0–10%) · young_tree (10–25%) · thriving (> 25%).
 * - "Watering" (completed actions, days with records) is shown but never changes the stage.
 */
import type { BusinessData } from "@/lib/data";
import {
  addDays,
  customerCount,
  dataCoverage,
  income,
  lastNDays,
  PERIOD_DAYS,
  profit,
  recordDates,
  startOfDay,
  type Period,
} from "@/lib/metrics";

export const BASELINE_MIN_COVERAGE_DAYS = 10;

export const STAGE_THRESHOLDS = { sapling: 0, young_tree: 10, thriving: 25 }; // % change

export type Stage = "seed" | "sprout" | "sapling" | "young_tree" | "thriving";

export const STAGE_LABELS: Record<Stage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  sapling: "Sapling",
  young_tree: "Young tree",
  thriving: "Thriving tree",
};

const GOAL_RULE: Record<string, string> = {
  profit: "Your tree grows when your profit grows compared to your first month.",
  customers: "Your tree grows when you serve more customers than in your first month.",
  cash_collected: "Your tree grows when you collect more money than in your first month.",
};

export function stageForPct(pct: number): Stage {
  if (pct < STAGE_THRESHOLDS.sapling) return "sprout";
  if (pct < STAGE_THRESHOLDS.young_tree) return "sapling";
  if (pct <= STAGE_THRESHOLDS.thriving) return "young_tree";
  return "thriving";
}

/** The owner's goal metric for a period, in cents (or a count for "customers"). */
export function goalValue(data: BusinessData, goal: string, period: Period, now: Date): number {
  if (goal === "customers") return customerCount(data.sales, period, now);
  if (goal === "cash_collected") return income(data.sales, period, now).cents;
  return profit(data.sales, data.expenses, period, now).cents;
}

export function findBaseline(dates: Date[], now: Date): Period | null {
  if (dates.length === 0) return null;
  const first = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
  const today = addDays(startOfDay(now), 1);
  for (let start = first; addDays(start, PERIOD_DAYS) <= today; start = addDays(start, 7)) {
    const window = { start, end: addDays(start, PERIOD_DAYS) };
    if (dataCoverage(dates, window, now).days >= BASELINE_MIN_COVERAGE_DAYS) return window;
  }
  return null;
}

export function growthScore(data: BusinessData, completedActions: number, now = new Date()) {
  const goal = data.business.growthGoal;
  const dates = recordDates(data.sales, data.expenses, data.enquiries);
  const latest = lastNDays(now, PERIOD_DAYS);
  const watering = {
    completedActions,
    daysWithRecords: dataCoverage(dates, latest, now).days,
  };
  const rule = GOAL_RULE[goal] ?? GOAL_RULE.profit;
  const baseline = findBaseline(dates, now);

  if (!baseline) {
    return { stage: "seed" as Stage, pct: null, baseline: null, baselineValue: null, latestValue: null, goal, rule, watering };
  }

  const baselineValue = goalValue(data, goal, baseline, now);
  const latestValue = goalValue(data, goal, latest, now);
  // If the baseline was zero or a loss, a % change is meaningless: grow if not worse.
  let pct: number | null = null;
  let stage: Stage;
  if (baselineValue <= 0) {
    stage = latestValue > baselineValue ? "sapling" : "sprout";
  } else {
    pct = Math.round(((latestValue - baselineValue) / baselineValue) * 1000) / 10;
    stage = stageForPct(pct);
  }
  return { stage, pct, baseline, baselineValue, latestValue, goal, rule, watering };
}

export type GrowthScore = ReturnType<typeof growthScore>;
