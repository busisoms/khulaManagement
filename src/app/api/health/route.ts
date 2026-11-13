import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Health check for the host: OK plus how many records are in the database. */
export async function GET() {
  try {
    const counts = await Promise.all([
      db.business.count(),
      db.sale.count(),
      db.payment.count(),
      db.expense.count(),
      db.enquiry.count(),
      db.stockItem.count(),
      db.loan.count(),
      db.action.count(),
    ]);
    return NextResponse.json({ ok: true, businesses: counts[0], records: counts.reduce((a, b) => a + b, 0) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "db error" }, { status: 503 });
  }
}
