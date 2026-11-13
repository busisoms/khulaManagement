/**
 * Facts builder. Turns computed metrics into a compact JSON object.
 * This object is the ONLY thing the LLM ever sees about the business,
 * and the evidence check (validate.ts) only accepts numbers that appear in it.
 *
 * Money is given in rands (numbers, max 2 decimals) because that's what the owner reads.
 */
import type { BusinessData } from "@/lib/data";
import {
  customerSources,
  dataCoverage,
  expenses,
  futureRecords,
  income,
  lastNDays,
  loanDue,
  overdue,
  owed,
  PERIOD_DAYS,
  previousPeriod,
  profit,
  recordDates,
  salesValue,
  slowStock,
  trend,
} from "@/lib/metrics";

const rands = (cents: number) => Math.round(cents) / 100;

export function computeFacts(data: BusinessData, now = new Date()) {
  const { business } = data;
  const has = (m: string) => business.modules.includes(m as never);
  const period = lastNDays(now, PERIOD_DAYS);
  const prev = previousPeriod(period);
  const dates = recordDates(data.sales, data.expenses, data.enquiries);

  const facts: Facts = {
    business: {
      name: business.name,
      category: business.category,
      area: business.area,
      growthGoal: business.growthGoal,
      monthlyBudgetRands: rands(business.monthlyBudgetCents),
    },
    period: { label: "last 4 weeks", days: PERIOD_DAYS },
    dataCoverageDays: dataCoverage(dates, period, now).days,
    futureDatedRecords: futureRecords(dates, now),
  };

  if (has("sales")) {
    const p = profit(data.sales, data.expenses, period, now);
    const pp = profit(data.sales, data.expenses, prev, now);
    const exp = expenses(data.expenses, period, now);
    const incomeTrend = trend(p.incomeCents, pp.incomeCents);
    const profitTrend = trend(p.cents, pp.cents);
    facts.sales = {
      incomeRands: rands(p.incomeCents),
      previousIncomeRands: rands(pp.incomeCents),
      incomeChangePct: incomeTrend.pct,
      salesValueRands: rands(salesValue(data.sales, period, now).cents),
      salesCount: salesValue(data.sales, period, now).count,
      expensesRands: rands(p.expensesCents),
      previousExpensesRands: rands(pp.expensesCents),
      expensesByCategoryRands: Object.fromEntries(Object.entries(exp.byCategory).map(([k, v]) => [k, rands(v)])),
      largestExpense: exp.largestCategory ? { category: exp.largestCategory.category, rands: rands(exp.largestCategory.cents) } : null,
      previousLargestExpenseRands: exp.largestCategory
        ? rands(expenses(data.expenses, prev, now).byCategory[exp.largestCategory.category] ?? 0)
        : null,
      profitRands: rands(p.cents),
      previousProfitRands: rands(pp.cents),
      profitChangePct: profitTrend.pct,
    };
  }

  if (has("payments")) {
    const o = owed(data.sales, now);
    const od = overdue(data.sales, now);
    facts.payments = {
      owedRands: rands(o.cents),
      overdueRands: rands(od.cents),
      overdueCount: od.items.length,
      overdue: od.items.slice(0, 5).map((i) => ({
        customer: i.customerName,
        item: i.description,
        owedRands: rands(i.owedCents),
        daysOverdue: i.daysOverdue,
      })),
    };
  }

  if (has("reach")) {
    const cs = customerSources(data.sales, data.enquiries, period, now);
    facts.reach = {
      salesBySource: Object.fromEntries(Object.entries(cs.bySource).map(([k, v]) => [k, v.sales])),
      enquiries: cs.enquiries,
      enquiriesConverted: cs.converted,
      conversionRatePct: cs.conversionRatePct,
      bestSource: cs.bestSource,
    };
  }

  if (has("stock")) {
    const s = slowStock(data.stock, now);
    facts.stock = {
      slowStockValueRands: rands(s.cents),
      slowItems: s.items.map((i) => ({ name: i.name, quantity: i.quantity, valueRands: rands(i.valueCents), daysSinceMoved: i.daysSinceMoved })),
    };
  }

  if (has("loans")) {
    const l = loanDue(data.loans, now);
    facts.loans = {
      instalmentsDueRands: rands(l.cents),
      dueSoon: l.items.map((i) => ({ lender: i.lender, instalmentRands: rands(i.instalmentCents), daysUntilDue: i.daysUntilDue })),
    };
  }

  return facts;
}

export type Facts = {
  business: { name: string; category: string; area: string; growthGoal: string; monthlyBudgetRands: number };
  period: { label: string; days: number };
  dataCoverageDays: number;
  futureDatedRecords: number;
  sales?: {
    incomeRands: number;
    previousIncomeRands: number;
    incomeChangePct: number | null;
    salesValueRands: number;
    salesCount: number;
    expensesRands: number;
    previousExpensesRands: number;
    expensesByCategoryRands: Record<string, number>;
    largestExpense: { category: string; rands: number } | null;
    previousLargestExpenseRands: number | null;
    profitRands: number;
    previousProfitRands: number;
    profitChangePct: number | null;
  };
  payments?: {
    owedRands: number;
    overdueRands: number;
    overdueCount: number;
    overdue: { customer: string; item: string; owedRands: number; daysOverdue: number }[];
  };
  reach?: {
    salesBySource: Record<string, number>;
    enquiries: number;
    enquiriesConverted: number;
    conversionRatePct: number | null;
    bestSource: string | null;
  };
  stock?: {
    slowStockValueRands: number;
    slowItems: { name: string; quantity: number; valueRands: number; daysSinceMoved: number }[];
  };
  loans?: {
    instalmentsDueRands: number;
    dueSoon: { lender: string; instalmentRands: number; daysUntilDue: number }[];
  };
};

/** Every number that appears anywhere in the facts (used by the evidence check). */
export function numbersInFacts(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(numbersInFacts);
  if (value && typeof value === "object") return Object.values(value).flatMap(numbersInFacts);
  return [];
}
