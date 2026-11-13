import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { parseModules } from "@/types";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  sale: "Sale saved.",
  payment: "Payment saved.",
  expense: "Spending saved.",
  enquiry: "Enquiry saved.",
  stock: "Stock saved.",
  loan: "Loan saved.",
};

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const business = await db.business.findUniqueOrThrow({ where: { id: (await getCurrentBusinessId())! } });
  const modules = parseModules(business.modules);

  const buttons = [
    { kind: "sale", label: "I made a sale", hint: "Someone bought something or ordered work" },
    { kind: "payment", label: "Someone paid me", hint: "Money in for work already done" },
    { kind: "expense", label: "I spent money", hint: "Materials, transport, rent…" },
    { kind: "enquiry", label: "New enquiry", hint: "Someone asked about your work" },
    ...(modules.includes("stock") ? [{ kind: "stock", label: "Stock", hint: "Add an item or update how many you have" }] : []),
    ...(modules.includes("loans") ? [{ kind: "loan", label: "Business loan", hint: "Add a loan you are paying back" }] : []),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">What happened?</h1>
      <p className="mt-1 text-muted">Tap one. It takes a few seconds.</p>
      {saved && SAVED[saved] && (
        <p role="status" className="mt-4 rounded-xl bg-brand-soft p-3 font-semibold text-brand-dark">
          ✓ {SAVED[saved]} Your numbers are updated.
        </p>
      )}
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {buttons.map((b) => (
          <li key={b.kind}>
            <Link href={`/record/${b.kind}`} className="card flex min-h-20 flex-col justify-center hover:border-brand/50 hover:bg-brand-soft/40">
              <span className="text-lg font-bold text-brand-dark">{b.label}</span>
              <span className="text-muted">{b.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
