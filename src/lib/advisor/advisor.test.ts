import { describe, expect, it, vi } from "vitest";
import type { Facts } from "./facts";
import { getAdvice } from "./index";
import { ruleBasedAdvice } from "./rules";
import type { Advice } from "./schema";
import { findInventedNumbers, numbersInText, validateAdvice } from "./validate";

vi.mock("@/lib/db", () => ({ db: {} }));

// Facts shaped like the seeded "Thandi's Tailoring".
function seedFacts(overrides: Partial<Facts> = {}): Facts {
  return {
    business: { name: "Thandi's Tailoring", category: "tailoring", area: "Small town", growthGoal: "profit", monthlyBudgetRands: 200 },
    period: { label: "last 4 weeks", days: 28 },
    dataCoverageDays: 22,
    futureDatedRecords: 0,
    sales: {
      incomeRands: 10855,
      previousIncomeRands: 6435,
      incomeChangePct: 68.7,
      salesValueRands: 11350,
      salesCount: 24,
      expensesRands: 7360,
      previousExpensesRands: 3500,
      expensesByCategoryRands: { materials: 4420, rent: 1500 },
      largestExpense: { category: "materials", rands: 4420 },
      previousLargestExpenseRands: 1460,
      profitRands: 3495,
      previousProfitRands: 2935,
      profitChangePct: 19.1,
    },
    payments: {
      owedRands: 2070,
      overdueRands: 1470,
      overdueCount: 3,
      overdue: [
        { customer: "Lindiwe M.", item: "Wedding guest dress", owedRands: 900, daysOverdue: 41 },
        { customer: "Sipho N.", item: "Church dress", owedRands: 350, daysOverdue: 24 },
      ],
    },
    reach: { salesBySource: { referral: 19, social: 2 }, enquiries: 6, enquiriesConverted: 3, conversionRatePct: 50, bestSource: "referral" },
    stock: { slowStockValueRands: 2550, slowItems: [{ name: "Shweshwe fabric (blue)", quantity: 3, valueRands: 1350, daysSinceMoved: 47 }] },
    loans: { instalmentsDueRands: 750, dueSoon: [{ lender: "Equipment finance", instalmentRands: 750, daysUntilDue: 5 }] },
    ...overrides,
  };
}

const goodLlmAnswer: Advice = {
  area: "payments",
  finding: "Lindiwe M. owes you R900 and it is 41 days late.",
  evidence: [
    { label: "Owed by Lindiwe M.", value: 900 },
    { label: "Days overdue", value: 41 },
  ],
  actionType: "payment_reminder",
  actionTitle: "Remind Lindiwe to pay",
  draftText: "Hi Lindiwe, a friendly reminder about the R900.",
  why: "It's money you already earned.",
  estimatedCostCents: 0,
};

describe("rule-based advisor (priority order)", () => {
  it("seed data -> payment reminder citing R900 and 41 days", () => {
    const a = ruleBasedAdvice(seedFacts());
    expect(a.actionType).toBe("payment_reminder");
    expect(a.evidence).toEqual(
      expect.arrayContaining([
        { label: "Owed by Lindiwe M.", value: 900 },
        { label: "Days overdue", value: 41 },
      ]),
    );
    expect(a.draftText).toContain("R900");
    expect(validateAdvice(a, seedFacts()).ok).toBe(true);
  });

  it("1. too little data -> record_more (even when money is overdue)", () => {
    expect(ruleBasedAdvice(seedFacts({ dataCoverageDays: 3 })).actionType).toBe("record_more");
  });

  it("3. loan due within 7 days and income below instalment -> loan_reminder", () => {
    const f = seedFacts({ payments: undefined });
    f.sales!.incomeRands = 500;
    expect(ruleBasedAdvice(f).actionType).toBe("loan_reminder");
  });

  it("4. profit down more than 20% -> expense_review on largest category", () => {
    const f = seedFacts({ payments: undefined, loans: undefined });
    f.sales!.profitChangePct = -30;
    const a = ruleBasedAdvice(f);
    expect(a.actionType).toBe("expense_review");
    expect(a.evidence.map((e) => e.value)).toContain(4420);
  });

  it("5. slow stock -> stock_promotion for the most valuable item", () => {
    const a = ruleBasedAdvice(seedFacts({ payments: undefined, loans: undefined }));
    expect(a.actionType).toBe("stock_promotion");
    expect(a.actionTitle).toContain("shweshwe");
  });

  it("6. otherwise -> promo_post using the best source", () => {
    const a = ruleBasedAdvice(seedFacts({ payments: undefined, loans: undefined, stock: undefined }));
    expect(a.actionType).toBe("promo_post");
    expect(a.evidence[0].value).toBe(19);
  });

  it("every rule output passes validation", () => {
    const variants = [
      seedFacts(),
      seedFacts({ dataCoverageDays: 2 }),
      seedFacts({ payments: undefined }),
      seedFacts({ payments: undefined, loans: undefined }),
      seedFacts({ payments: undefined, loans: undefined, stock: undefined }),
    ];
    for (const f of variants) expect(validateAdvice(ruleBasedAdvice(f), f)).toMatchObject({ ok: true });
  });
});

describe("evidence validation", () => {
  it("reads numbers from text, including spaced thousands", () => {
    expect(numbersInText("R1 470 over 41 days")).toEqual([1470, 41]);
  });

  it("rejects an invented number", () => {
    const invented = { ...goodLlmAnswer, evidence: [{ label: "Owed by Lindiwe M.", value: 1200 }] };
    expect(findInventedNumbers(invented, seedFacts())).toEqual([1200]);
    expect(validateAdvice(invented, seedFacts())).toMatchObject({ ok: false });
  });

  it("rejects an invented number hidden in a string value", () => {
    const invented = { ...goodLlmAnswer, evidence: [{ label: "Overdue", value: "R5 000" }] };
    expect(validateAdvice(invented, seedFacts())).toMatchObject({ ok: false });
  });

  it("accepts numbers within the tolerance of 1", () => {
    const close = { ...goodLlmAnswer, evidence: [{ label: "Owed", value: 900.5 }] };
    expect(validateAdvice(close, seedFacts()).ok).toBe(true);
  });

  it("rejects a cost over the monthly budget", () => {
    expect(validateAdvice({ ...goodLlmAnswer, estimatedCostCents: 50000 }, seedFacts())).toMatchObject({ ok: false });
  });

  it("rejects a draft longer than 600 characters", () => {
    expect(validateAdvice({ ...goodLlmAnswer, draftText: "x".repeat(601) }, seedFacts())).toMatchObject({ ok: false });
  });
});

describe("getAdvice with an LLM", () => {
  it("uses a valid LLM answer", async () => {
    const r = await getAdvice(seedFacts(), async () => goodLlmAnswer);
    expect(r.origin).toBe("llm");
  });

  it("falls back to rules when the LLM invents a number (no retry)", async () => {
    const ask = vi.fn(async () => ({ ...goodLlmAnswer, evidence: [{ label: "Owed", value: 12345 }] }));
    const r = await getAdvice(seedFacts(), ask);
    expect(r.origin).toBe("rules");
    expect(r.advice.actionType).toBe("payment_reminder");
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("retries once on a malformed answer, then falls back", async () => {
    const ask = vi.fn(async () => ({ nonsense: true }));
    const r = await getAdvice(seedFacts(), ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(r.origin).toBe("rules");
  });

  it("retries once on an error and uses the second answer", async () => {
    const ask = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(goodLlmAnswer);
    const r = await getAdvice(seedFacts(), ask);
    expect(r.origin).toBe("llm");
  });
});
