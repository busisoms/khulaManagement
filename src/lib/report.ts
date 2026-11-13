/**
 * Monthly report: last 4 weeks vs the 4 weeks before.
 * "What seemed to help" is worded as association, never as cause.
 */
import type { BusinessData } from "@/lib/data";
import {
  addDays,
  customerCount,
  dataCoverage,
  expenses,
  inPeriod,
  income,
  lastNDays,
  owed,
  PERIOD_DAYS,
  previousPeriod,
  profit,
  recordDates,
  salesValue,
  startOfDay,
  trend,
} from "@/lib/metrics";

/** Charts are shown only with at least this many days of records in the last 4 weeks. */
export const CHART_MIN_COVERAGE_DAYS = 10;

/** How long after an action we look for related changes. */
export const ASSOCIATION_WINDOW_DAYS = 28;

type ActionRow = { type: string; status: string; payload: string; completedAt: Date | null; outcomeNote: string | null };

export function buildReport(data: BusinessData, actions: ActionRow[], now = new Date()) {
  const period = lastNDays(now, PERIOD_DAYS);
  const prev = previousPeriod(period);
  const p = profit(data.sales, data.expenses, period, now);
  const pp = profit(data.sales, data.expenses, prev, now);

  const rows = [
    { label: "Money in", ...trend(p.incomeCents, pp.incomeCents), money: true, goodWhenUp: true },
    { label: "Money spent", ...trend(p.expensesCents, pp.expensesCents), money: true, goodWhenUp: false },
    { label: "Profit", ...trend(p.cents, pp.cents), money: true, goodWhenUp: true },
    {
      label: "Sales made",
      ...trend(salesValue(data.sales, period, now).count, salesValue(data.sales, prev, now).count),
      money: false,
      goodWhenUp: true,
    },
    { label: "Customers", ...trend(customerCount(data.sales, period, now), customerCount(data.sales, prev, now)), money: false, goodWhenUp: true },
  ];

  // Weekly money in / out for the last 8 weeks (chart).
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(prev.start, i * 7);
    const w = { start, end: addDays(start, 7) };
    return { start, incomeCents: income(data.sales, w, now).cents, expensesCents: expenses(data.expenses, w, now).cents };
  });

  const coverage = dataCoverage(recordDates(data.sales, data.expenses, data.enquiries), period, now).days;
  const largestExpense = expenses(data.expenses, period, now).largestCategory;

  // Actions finished in the last 4 weeks.
  const recentDone = actions.filter((a) => a.status === "done" && a.completedAt && inPeriod(a.completedAt, period));

  // Associations for actions done in the last 8 weeks.
  const associations: string[] = [];
  for (const a of actions.filter((x) => x.status === "done" && x.completedAt && x.completedAt >= prev.start)) {
    const from = a.completedAt!;
    const until = addDays(startOfDay(from), ASSOCIATION_WINDOW_DAYS + 1);
    const after = { start: from, end: until };
    if (a.type === "promo_post" || a.type === "stock_promotion") {
      // Count enquiries from the day of the post onwards.
      const window = { start: startOfDay(from), end: until };
      const social = data.enquiries.filter((e) => e.source === "social" && inPeriod(e.date, window) && e.date <= now);
      const converted = social.filter((e) => e.converted).length;
      if (social.length > 0) {
        associations.push(
          `In the 4 weeks after your post, ${social.length} ${social.length === 1 ? "person" : "people"} asked about your work through social media, and ${converted} became ${converted === 1 ? "a customer" : "customers"}.`,
        );
      }
    }
    if (a.type === "payment_reminder") {
      const customer = (JSON.parse(a.payload).customer as string | undefined) ?? "";
      const paidCents = data.sales
        .filter((s) => s.customerName && customer && s.customerName === customer)
        .flatMap((s) => s.payments)
        .filter((pay) => inPeriod(pay.date, after) && pay.date <= now)
        .reduce((t, pay) => t + pay.amountCents, 0);
      if (paidCents > 0) associations.push(`After your reminder, ${customer} paid R${(paidCents / 100).toLocaleString("en-ZA")}.`);
    }
  }

  return {
    period,
    prev,
    rows,
    weeks,
    coverage,
    showCharts: coverage >= CHART_MIN_COVERAGE_DAYS,
    owedCents: owed(data.sales, now).cents,
    largestExpense,
    recentDone,
    associations,
  };
}
