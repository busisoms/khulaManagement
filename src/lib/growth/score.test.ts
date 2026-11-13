import { describe, expect, it } from "vitest";
import type { BusinessData } from "@/lib/data";
import { addDays, type SaleRec } from "@/lib/metrics";
import { growthScore, stageForPct } from "./score";

const NOW = new Date(2026, 10, 13, 12);
const ago = (n: number) => addDays(NOW, -n);

function data(sales: SaleRec[], goal = "profit"): BusinessData {
  return {
    business: { growthGoal: goal } as BusinessData["business"],
    sales,
    expenses: [],
    stock: [],
    loans: [],
    enquiries: [],
  };
}
/** A paid sale of `rands` on each of the given days-ago. */
function paidSales(days: number[], rands: number): SaleRec[] {
  return days.map((d, i) => ({
    id: `${d}-${i}`,
    date: ago(d),
    description: "x",
    amountCents: rands * 100,
    customerId: null,
    customerName: null,
    source: "referral",
    payments: [{ date: ago(d), amountCents: rands * 100 }],
  }));
}
const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => from - i);

describe("stage thresholds", () => {
  it("maps % change to stages", () => {
    expect(stageForPct(-5)).toBe("sprout");
    expect(stageForPct(0)).toBe("sapling");
    expect(stageForPct(9.9)).toBe("sapling");
    expect(stageForPct(10)).toBe("young_tree");
    expect(stageForPct(25)).toBe("young_tree");
    expect(stageForPct(25.1)).toBe("thriving");
  });
});

describe("growth score", () => {
  it("a fresh business is a seed (collecting the starting point)", () => {
    const g = growthScore(data(paidSales([3, 2, 1], 100)), 0, NOW);
    expect(g.stage).toBe("seed");
    expect(g.baseline).toBeNull();
  });

  it("no baseline when the first 4 weeks have fewer than 10 days of records", () => {
    const g = growthScore(data(paidSales([55, 50, 45, 40, 35, 30, 1], 100)), 0, NOW);
    expect(g.stage).toBe("seed");
  });

  it("compares the latest 4 weeks with the baseline", () => {
    // Baseline weeks (55..28 days ago): R100 per day on 12 days. Latest 28 days: R120 per day on 12 days.
    const g = growthScore(data([...paidSales(range(55, 44), 100), ...paidSales(range(20, 9), 120)]), 2, NOW);
    expect(g.baselineValue).toBe(120000);
    expect(g.latestValue).toBe(144000);
    expect(g.pct).toBe(20);
    expect(g.stage).toBe("young_tree");
  });

  it("watering (actions, record days) does not change the stage", () => {
    const sales = [...paidSales(range(55, 44), 100), ...paidSales(range(20, 9), 100)];
    expect(growthScore(data(sales), 0, NOW).stage).toBe(growthScore(data(sales), 50, NOW).stage);
    expect(growthScore(data(sales), 50, NOW).watering.completedActions).toBe(50);
  });

  it("customers goal counts customers", () => {
    const g = growthScore(data([...paidSales(range(55, 44), 100), ...paidSales(range(20, 6), 100)], "customers"), 0, NOW);
    expect(g.baselineValue).toBe(12);
    expect(g.latestValue).toBe(15);
    expect(g.stage).toBe("young_tree");
  });
});
