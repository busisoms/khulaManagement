import { describe, expect, it } from "vitest";
import {
  addDays,
  customerCount,
  customerSources,
  dataCoverage,
  expenses,
  income,
  lastNDays,
  loanDue,
  overdue,
  owed,
  previousPeriod,
  profit,
  salesValue,
  slowStock,
  topCustomers,
  trend,
  type SaleRec,
} from "./index";

const NOW = new Date(2026, 10, 13, 12, 0, 0); // 13 Nov 2026, midday
const ago = (n: number) => addDays(NOW, -n);
const PERIOD = lastNDays(NOW, 28);

let id = 0;
function sale(daysAgo: number, rands: number, payments: [number, number][] = [], extra: Partial<SaleRec> = {}): SaleRec {
  return {
    id: `s${++id}`,
    date: ago(daysAgo),
    description: "Hem",
    amountCents: rands * 100,
    customerId: null,
    customerName: null,
    source: "referral",
    payments: payments.map(([d, r]) => ({ date: ago(d), amountCents: r * 100 })),
    ...extra,
  };
}

describe("periods", () => {
  it("last 28 days includes today and previous period is the 28 days before", () => {
    expect(PERIOD.end > NOW).toBe(true);
    const prev = previousPeriod(PERIOD);
    expect(prev.end).toEqual(PERIOD.start);
    expect(PERIOD.start.getTime() - prev.start.getTime()).toBe(PERIOD.end.getTime() - PERIOD.start.getTime());
  });
});

describe("no records", () => {
  it("everything is zero or empty", () => {
    expect(income([], PERIOD, NOW).cents).toBe(0);
    expect(salesValue([], PERIOD, NOW).cents).toBe(0);
    expect(expenses([], PERIOD, NOW)).toMatchObject({ cents: 0, largestCategory: null });
    expect(profit([], [], PERIOD, NOW).cents).toBe(0);
    expect(owed([], NOW)).toEqual({ cents: 0, byCustomer: [] });
    expect(overdue([], NOW)).toEqual({ cents: 0, items: [] });
    expect(customerSources([], [], PERIOD, NOW)).toMatchObject({ enquiries: 0, conversionRatePct: null, bestSource: null });
    expect(topCustomers([], PERIOD, NOW)).toEqual([]);
    expect(slowStock([], NOW)).toEqual({ cents: 0, items: [] });
    expect(loanDue([], NOW)).toEqual({ cents: 0, items: [] });
    expect(dataCoverage([], PERIOD, NOW).days).toBe(0);
  });
});

describe("income vs sales value", () => {
  it("one record: income counts payments received, sales value counts sales made", () => {
    const s = [sale(3, 500, [[3, 200]])];
    expect(income(s, PERIOD, NOW).cents).toBe(20000);
    expect(salesValue(s, PERIOD, NOW).cents).toBe(50000);
  });

  it("a payment received this period for an old sale is income this period", () => {
    const s = [sale(40, 300, [[2, 300]])];
    expect(income(s, PERIOD, NOW).cents).toBe(30000);
    expect(salesValue(s, PERIOD, NOW).cents).toBe(0);
  });
});

describe("expenses and profit", () => {
  const exp = [
    { date: ago(1), category: "materials", amountCents: 30000 },
    { date: ago(2), category: "rent", amountCents: 150000 },
    { date: ago(3), category: "materials", amountCents: 10000 },
    { date: ago(40), category: "rent", amountCents: 99900 },
  ];
  it("sums the period with a breakdown and largest category", () => {
    const e = expenses(exp, PERIOD, NOW);
    expect(e.cents).toBe(190000);
    expect(e.byCategory).toEqual({ materials: 40000, rent: 150000 });
    expect(e.largestCategory).toEqual({ category: "rent", cents: 150000 });
  });
  it("profit can be negative", () => {
    const p = profit([sale(1, 500, [[1, 500]])], exp, PERIOD, NOW);
    expect(p).toEqual({ cents: 50000 - 190000, incomeCents: 50000, expensesCents: 190000 });
  });
});

describe("owed and overdue", () => {
  it("handles partial payments and over-payments", () => {
    const s = [
      sale(5, 650, [[5, 300]], { customerId: "c1", customerName: "Sipho" }),
      sale(5, 100, [[5, 150]], { customerId: "c2", customerName: "Over" }), // over-paid -> owes 0
    ];
    expect(owed(s, NOW)).toEqual({ cents: 35000, byCustomer: [{ customerId: "c1", name: "Sipho", cents: 35000 }] });
  });

  it("is overdue only after DUE_DAYS (14), sorted by days overdue", () => {
    const s = [
      sale(55, 900, [], { customerName: "Lindiwe" }),
      sale(14, 100, []), // due today -> not overdue
      sale(15, 50, []), // 1 day overdue
      sale(24, 220, [], { customerName: "Thabo" }),
    ];
    const o = overdue(s, NOW);
    expect(o.items.map((i) => i.daysOverdue)).toEqual([41, 10, 1]);
    expect(o.items[0]).toMatchObject({ customerName: "Lindiwe", owedCents: 90000 });
    expect(o.cents).toBe(90000 + 22000 + 5000);
  });

  it("totals per customer across several sales", () => {
    const s = [
      sale(30, 100, [], { customerId: "c1", customerName: "A" }),
      sale(20, 200, [], { customerId: "c1", customerName: "A" }),
    ];
    expect(owed(s, NOW).byCustomer).toEqual([{ customerId: "c1", name: "A", cents: 30000 }]);
  });
});

describe("future-dated records", () => {
  it("are excluded and flagged", () => {
    const future = sale(-3, 999, [[-3, 999]]);
    const period = { start: ago(10), end: addDays(NOW, 10) }; // period extends into the future
    expect(income([future], period, NOW)).toMatchObject({ cents: 0, futureExcluded: 1 });
    expect(salesValue([future], period, NOW)).toMatchObject({ cents: 0, futureExcluded: 1 });
    expect(owed([future], NOW).cents).toBe(0);
    expect(dataCoverage([future.date], period, NOW).days).toBe(0);
  });
});

describe("trend", () => {
  it("returns change and %", () => {
    expect(trend(120, 100)).toEqual({ current: 120, previous: 100, change: 20, pct: 20 });
    expect(trend(80, 100).pct).toBe(-20);
  });
  it("% is null when previous is 0", () => {
    expect(trend(50, 0)).toEqual({ current: 50, previous: 0, change: 50, pct: null });
  });
  it("uses the size of a negative previous value", () => {
    expect(trend(-50, -100).pct).toBe(50); // loss halved = improvement
  });
});

describe("customers and reach", () => {
  it("counts sources and conversion rate", () => {
    const s = [sale(1, 100, [], { source: "referral" }), sale(2, 100, [], { source: "referral" }), sale(3, 100, [], { source: "social" })];
    const e = [
      { date: ago(1), source: "social", converted: true },
      { date: ago(2), source: "social", converted: false },
      { date: ago(3), source: "walk_in", converted: false },
      { date: ago(4), source: "social", converted: true },
    ];
    const r = customerSources(s, e, PERIOD, NOW);
    expect(r.bySource.social).toEqual({ sales: 1, enquiries: 3, converted: 2 });
    expect(r.conversionRatePct).toBe(50);
    expect(r.bestSource).toBe("referral");
  });

  it("top customers by money received, max 5", () => {
    const s = Array.from({ length: 7 }, (_, i) =>
      sale(2, (i + 1) * 100, [[2, (i + 1) * 100]], { customerId: `c${i}`, customerName: `C${i}` }),
    );
    const top = topCustomers(s, PERIOD, NOW);
    expect(top).toHaveLength(5);
    expect(top[0]).toEqual({ customerId: "c6", name: "C6", cents: 70000 });
  });

  it("customer count: named customers once, unnamed sales each", () => {
    const s = [
      sale(1, 1, [], { customerId: "a" }),
      sale(2, 1, [], { customerId: "a" }),
      sale(3, 1, []),
      sale(4, 1, []),
    ];
    expect(customerCount(s, PERIOD, NOW)).toBe(3);
  });
});

describe("slow stock", () => {
  it("only items with quantity > 0 unmoved > 30 days; value = qty × unit cost", () => {
    const r = slowStock(
      [
        { id: "a", name: "Satin", quantity: 2, unitCostCents: 60000, lastMovedAt: ago(52) },
        { id: "b", name: "Shweshwe", quantity: 3, unitCostCents: 45000, lastMovedAt: ago(47) },
        { id: "c", name: "Zips", quantity: 0, unitCostCents: 800, lastMovedAt: ago(60) },
        { id: "d", name: "Thread", quantity: 40, unitCostCents: 1500, lastMovedAt: ago(3) },
        { id: "e", name: "Edge", quantity: 1, unitCostCents: 100, lastMovedAt: ago(30) }, // exactly 30 -> not slow
      ],
      NOW,
    );
    expect(r.items.map((i) => i.name)).toEqual(["Shweshwe", "Satin"]);
    expect(r.cents).toBe(135000 + 120000);
  });
});

describe("loans", () => {
  it("lists loans due within 14 days with total instalments", () => {
    const r = loanDue(
      [
        { id: "a", lender: "A", instalmentCents: 75000, balanceCents: 450000, nextDueDate: addDays(NOW, 5) },
        { id: "b", lender: "B", instalmentCents: 10000, balanceCents: 10000, nextDueDate: addDays(NOW, 20) },
        { id: "c", lender: "C", instalmentCents: 5000, balanceCents: 0, nextDueDate: addDays(NOW, 1) }, // paid off
      ],
      NOW,
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ lender: "A", daysUntilDue: 5 });
    expect(r.cents).toBe(75000);
  });
});

describe("data coverage", () => {
  it("counts distinct days with records", () => {
    const r = dataCoverage([ago(1), ago(1), ago(2), ago(40)], PERIOD, NOW);
    expect(r).toEqual({ days: 2, periodDays: 28 });
  });
});
