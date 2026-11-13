/**
 * The metrics engine. Pure functions, no AI, no database.
 * Every number the app (or the LLM) shows comes from here.
 *
 * Records dated after `now` are excluded and counted in `futureExcluded`,
 * so the UI can flag them ("2 records have a future date").
 */
import { DUE_DAYS, LOAN_DUE_WINDOW_DAYS, SLOW_STOCK_DAYS } from "./constants";
import { addDays, dayKey, daysBetween, inPeriod, type Period } from "./dates";

export * from "./constants";
export * from "./dates";

// ---------- input shapes (plain data, mapped from Prisma rows) ----------

export type PaymentRec = { date: Date; amountCents: number };
export type SaleRec = {
  id: string;
  date: Date;
  description: string;
  amountCents: number;
  customerId: string | null;
  customerName: string | null;
  source: string;
  payments: PaymentRec[];
};
export type ExpenseRec = { date: Date; category: string; amountCents: number };
export type StockRec = { id: string; name: string; quantity: number; unitCostCents: number; lastMovedAt: Date };
export type LoanRec = { id: string; lender: string; instalmentCents: number; balanceCents: number; nextDueDate: Date };
export type EnquiryRec = { date: Date; source: string; converted: boolean };

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const notFuture = (d: Date, now: Date) => d <= now;

/** Records in the period, with records dated after `now` left out and counted. */
function pickInPeriod<T extends { date: Date }>(records: T[], period: Period, now: Date) {
  const inside = records.filter((r) => inPeriod(r.date, period));
  const valid = inside.filter((r) => notFuture(r.date, now));
  return { valid, futureExcluded: inside.length - valid.length };
}

// ---------- money in and out ----------

/** Income = payments RECEIVED in the period (not sales made). */
export function income(sales: SaleRec[], period: Period, now = new Date()) {
  const { valid, futureExcluded } = pickInPeriod(sales.flatMap((s) => s.payments), period, now);
  return { cents: sum(valid.map((p) => p.amountCents)), count: valid.length, futureExcluded };
}

/** Value of sales made (dated) in the period, paid or not. */
export function salesValue(sales: SaleRec[], period: Period, now = new Date()) {
  const { valid, futureExcluded } = pickInPeriod(sales, period, now);
  return { cents: sum(valid.map((s) => s.amountCents)), count: valid.length, futureExcluded };
}

export function expenses(records: ExpenseRec[], period: Period, now = new Date()) {
  const { valid, futureExcluded } = pickInPeriod(records, period, now);
  const byCategory: Record<string, number> = {};
  for (const e of valid) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountCents;
  const largest = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  return {
    cents: sum(valid.map((e) => e.amountCents)),
    byCategory,
    largestCategory: largest ? { category: largest[0], cents: largest[1] } : null,
    futureExcluded,
  };
}

/** Profit = income − expenses. */
export function profit(sales: SaleRec[], expenseRecs: ExpenseRec[], period: Period, now = new Date()) {
  const inc = income(sales, period, now).cents;
  const exp = expenses(expenseRecs, period, now).cents;
  return { cents: inc - exp, incomeCents: inc, expensesCents: exp };
}

// ---------- money owed ----------

/** Outstanding on one sale. Over-payments count as fully paid (never negative). */
export function outstandingCents(sale: SaleRec, now = new Date()): number {
  const paid = sum(sale.payments.filter((p) => notFuture(p.date, now)).map((p) => p.amountCents));
  return Math.max(0, sale.amountCents - paid);
}

/** Due date of a sale: sale date + DUE_DAYS. */
export function dueDate(sale: SaleRec): Date {
  return addDays(sale.date, DUE_DAYS);
}

/** Total owed across all sales (any date up to now), plus per-customer totals. */
export function owed(sales: SaleRec[], now = new Date()) {
  const byCustomer = new Map<string, { customerId: string | null; name: string; cents: number }>();
  let cents = 0;
  for (const s of sales) {
    if (!notFuture(s.date, now)) continue;
    const o = outstandingCents(s, now);
    if (o === 0) continue;
    cents += o;
    const key = s.customerId ?? `sale:${s.id}`;
    const entry = byCustomer.get(key) ?? { customerId: s.customerId, name: s.customerName ?? "Unnamed customer", cents: 0 };
    entry.cents += o;
    byCustomer.set(key, entry);
  }
  return { cents, byCustomer: [...byCustomer.values()].sort((a, b) => b.cents - a.cents) };
}

/** Outstanding sales past their due date, most overdue first. */
export function overdue(sales: SaleRec[], now = new Date()) {
  const items = sales
    .filter((s) => notFuture(s.date, now))
    .map((s) => ({ sale: s, owedCents: outstandingCents(s, now), daysOverdue: daysBetween(dueDate(s), now) }))
    .filter((x) => x.owedCents > 0 && x.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.owedCents - a.owedCents)
    .map((x) => ({
      saleId: x.sale.id,
      customerId: x.sale.customerId,
      customerName: x.sale.customerName ?? "Unnamed customer",
      description: x.sale.description,
      saleDate: x.sale.date,
      dueDate: dueDate(x.sale),
      owedCents: x.owedCents,
      daysOverdue: x.daysOverdue,
    }));
  return { cents: sum(items.map((i) => i.owedCents)), items };
}

// ---------- trends ----------

/** This period vs the previous one. `pct` is null when the previous value is 0. */
export function trend(current: number, previous: number) {
  const change = current - previous;
  const pct = previous === 0 ? null : Math.round((change / Math.abs(previous)) * 1000) / 10;
  return { current, previous, change, pct };
}

// ---------- customers & reach ----------

export function customerSources(sales: SaleRec[], enquiries: EnquiryRec[], period: Period, now = new Date()) {
  const s = pickInPeriod(sales, period, now).valid;
  const e = pickInPeriod(enquiries, period, now).valid;
  const bySource: Record<string, { sales: number; enquiries: number; converted: number }> = {};
  const row = (src: string) => (bySource[src] ??= { sales: 0, enquiries: 0, converted: 0 });
  for (const x of s) row(x.source).sales++;
  for (const x of e) {
    row(x.source).enquiries++;
    if (x.converted) row(x.source).converted++;
  }
  const converted = e.filter((x) => x.converted).length;
  const best = Object.entries(bySource)
    .filter(([src]) => src !== "unknown")
    .sort((a, b) => b[1].sales - a[1].sales)[0];
  return {
    bySource,
    enquiries: e.length,
    converted,
    /** % of enquiries that became customers; null when there were no enquiries. */
    conversionRatePct: e.length === 0 ? null : Math.round((converted / e.length) * 100),
    bestSource: best ? best[0] : null,
  };
}

/** Top 5 customers by money received in the period. */
export function topCustomers(sales: SaleRec[], period: Period, now = new Date()) {
  const totals = new Map<string, { customerId: string; name: string; cents: number }>();
  for (const s of sales) {
    if (!s.customerId) continue;
    const paid = sum(pickInPeriod(s.payments, period, now).valid.map((p) => p.amountCents));
    if (paid === 0) continue;
    const t = totals.get(s.customerId) ?? { customerId: s.customerId, name: s.customerName ?? "", cents: 0 };
    t.cents += paid;
    totals.set(s.customerId, t);
  }
  return [...totals.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
}

/** Number of different customers who bought in the period (unnamed sales count as one customer each). */
export function customerCount(sales: SaleRec[], period: Period, now = new Date()) {
  const valid = pickInPeriod(sales, period, now).valid;
  const named = new Set(valid.filter((s) => s.customerId).map((s) => s.customerId));
  return named.size + valid.filter((s) => !s.customerId).length;
}

// ---------- stock & loans ----------

/** Items with quantity > 0 that haven't moved for more than SLOW_STOCK_DAYS. */
export function slowStock(items: StockRec[], now = new Date()) {
  const slow = items
    .filter((i) => i.quantity > 0 && daysBetween(i.lastMovedAt, now) > SLOW_STOCK_DAYS)
    .map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      valueCents: i.quantity * i.unitCostCents,
      daysSinceMoved: daysBetween(i.lastMovedAt, now),
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
  return { cents: sum(slow.map((i) => i.valueCents)), items: slow };
}

/** Loans with an instalment due within LOAN_DUE_WINDOW_DAYS (or already late). */
export function loanDue(loans: LoanRec[], now = new Date()) {
  const items = loans
    .filter((l) => l.balanceCents > 0)
    .map((l) => ({
      id: l.id,
      lender: l.lender,
      instalmentCents: l.instalmentCents,
      nextDueDate: l.nextDueDate,
      daysUntilDue: daysBetween(now, l.nextDueDate),
    }))
    .filter((l) => l.daysUntilDue <= LOAN_DUE_WINDOW_DAYS)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  return { cents: sum(items.map((i) => i.instalmentCents)), items };
}

// ---------- data coverage ----------

/** Number of days in the period with at least one record (future-dated records ignored). */
export function dataCoverage(dates: Date[], period: Period, now = new Date()) {
  const days = new Set(dates.filter((d) => inPeriod(d, period) && notFuture(d, now)).map(dayKey));
  return { days: days.size, periodDays: daysBetween(period.start, period.end) };
}

/** All record dates for a business, for dataCoverage. */
export function recordDates(sales: SaleRec[], expenseRecs: ExpenseRec[], enquiries: EnquiryRec[]): Date[] {
  return [
    ...sales.map((s) => s.date),
    ...sales.flatMap((s) => s.payments.map((p) => p.date)),
    ...expenseRecs.map((e) => e.date),
    ...enquiries.map((e) => e.date),
  ];
}

/** Count of records dated in the future (to warn the owner). */
export function futureRecords(dates: Date[], now = new Date()) {
  return dates.filter((d) => d > now).length;
}
