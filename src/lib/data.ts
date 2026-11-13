import { db } from "@/lib/db";
import type { EnquiryRec, ExpenseRec, LoanRec, SaleRec, StockRec } from "@/lib/metrics";
import { parseModules } from "@/types";

/** Everything the metrics need for one business, as plain records. */
export async function loadBusinessData(businessId: string) {
  const business = await db.business.findUniqueOrThrow({ where: { id: businessId } });
  const [sales, expenseRows, stock, loanRows, enquiryRows] = await Promise.all([
    db.sale.findMany({ where: { businessId }, include: { payments: true, customer: true }, orderBy: { date: "asc" } }),
    db.expense.findMany({ where: { businessId } }),
    db.stockItem.findMany({ where: { businessId } }),
    db.loan.findMany({ where: { businessId } }),
    db.enquiry.findMany({ where: { businessId } }),
  ]);

  return {
    business: { ...business, modules: parseModules(business.modules) },
    sales: sales.map(
      (s): SaleRec => ({
        id: s.id,
        date: s.date,
        description: s.description,
        amountCents: s.amountCents,
        customerId: s.customerId,
        customerName: s.customer?.name ?? null,
        source: s.source,
        payments: s.payments.map((p) => ({ date: p.date, amountCents: p.amountCents })),
      }),
    ),
    expenses: expenseRows.map((e): ExpenseRec => ({ date: e.date, category: e.category, amountCents: e.amountCents })),
    stock: stock.map(
      (i): StockRec => ({ id: i.id, name: i.name, quantity: i.quantity, unitCostCents: i.unitCostCents, lastMovedAt: i.lastMovedAt }),
    ),
    loans: loanRows.map(
      (l): LoanRec => ({ id: l.id, lender: l.lender, instalmentCents: l.instalmentCents, balanceCents: l.balanceCents, nextDueDate: l.nextDueDate }),
    ),
    enquiries: enquiryRows.map((e): EnquiryRec => ({ date: e.date, source: e.source, converted: e.converted })),
  };
}

export type BusinessData = Awaited<ReturnType<typeof loadBusinessData>>;
