import { db } from "@/lib/db";

// Developer-only view of the raw records. Not linked from the app's navigation.
export const dynamic = "force-dynamic";

const rands = (cents: number) => `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
const day = (d: Date) => d.toISOString().slice(0, 10);

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-semibold">
        {title} <span className="font-normal text-gray-500">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((h) => (
                <th key={h} className="border px-2 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border px-2 py-1 whitespace-nowrap">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function DebugPage() {
  const businesses = await db.business.findMany({
    include: {
      customers: true,
      sales: { include: { customer: true, payments: true }, orderBy: { date: "asc" } },
      expenses: { orderBy: { date: "asc" } },
      stockItems: true,
      loans: true,
      enquiries: { orderBy: { date: "asc" } },
      recommendations: true,
      actions: { include: { auditEvents: { orderBy: { timestamp: "asc" } } } },
    },
  });

  if (businesses.length === 0) {
    return <main className="p-6">No businesses yet. Run <code>npm run db:reset</code>.</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Debug: seeded records</h1>
      {businesses.map((b) => (
        <div key={b.id} className="mb-12">
          <h2 className="mb-4 text-xl font-bold">
            {b.name} — {b.category}, {b.area}
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Records: {b.recordKeeping} · Goal: {b.growthGoal} · Budget: {rands(b.monthlyBudgetCents)}/month · Modules:{" "}
            {JSON.parse(b.modules).join(", ")}
          </p>

          <Table title="Customers" headers={["Name", "Phone"]} rows={b.customers.map((c) => [c.name, c.phone ?? "—"])} />
          <Table
            title="Sales"
            headers={["Date", "Description", "Customer", "Source", "Amount", "Paid", "Payments"]}
            rows={b.sales.map((s) => [
              day(s.date),
              s.description,
              s.customer?.name ?? "—",
              s.source,
              rands(s.amountCents),
              rands(s.payments.reduce((t, p) => t + p.amountCents, 0)),
              s.payments.map((p) => `${day(p.date)} ${rands(p.amountCents)} ${p.method}`).join("; ") || "—",
            ])}
          />
          <Table
            title="Expenses"
            headers={["Date", "Category", "Amount", "Note"]}
            rows={b.expenses.map((e) => [day(e.date), e.category, rands(e.amountCents), e.note])}
          />
          <Table
            title="Stock"
            headers={["Name", "Unit", "Qty", "Unit cost", "Last moved"]}
            rows={b.stockItems.map((s) => [s.name, s.unit, s.quantity, rands(s.unitCostCents), day(s.lastMovedAt)])}
          />
          <Table
            title="Loans"
            headers={["Lender", "Principal", "Balance", "Instalment", "Next due"]}
            rows={b.loans.map((l) => [l.lender, rands(l.principalCents), rands(l.balanceCents), rands(l.instalmentCents), day(l.nextDueDate)])}
          />
          <Table
            title="Enquiries"
            headers={["Date", "Source", "Converted", "Note"]}
            rows={b.enquiries.map((e) => [day(e.date), e.source, e.converted ? "yes" : "no", e.note])}
          />
          <Table
            title="Recommendations"
            headers={["Created", "Area", "Action", "Origin", "Status", "Finding"]}
            rows={b.recommendations.map((r) => [day(r.createdAt), r.area, r.actionType, r.origin, r.status, r.finding])}
          />
          <Table
            title="Actions"
            headers={["Type", "Status", "Approved", "Completed", "Outcome", "Audit trail"]}
            rows={b.actions.map((a) => [
              a.type,
              a.status,
              a.approvedAt ? day(a.approvedAt) : "—",
              a.completedAt ? day(a.completedAt) : "—",
              a.outcomeNote ?? "—",
              a.auditEvents.map((e) => `${day(e.timestamp)} ${e.eventType}`).join(" → "),
            ])}
          />
        </div>
      ))}
    </main>
  );
}
