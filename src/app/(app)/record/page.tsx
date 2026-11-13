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
    { kind: "sale", label: "I made a sale", hint: "Someone bought something or ordered work", icon: "M12 5v14M5 12h14", tone: "bg-brand-soft text-brand" },
    { kind: "payment", label: "Someone paid me", hint: "Money in for work already done", icon: "M4 12h16M14 6l6 6-6 6", tone: "bg-brand-soft text-brand" },
    { kind: "expense", label: "I spent money", hint: "Materials, transport, rent…", icon: "M20 12H4M10 6l-6 6 6 6", tone: "bg-accent-soft text-accent" },
    { kind: "enquiry", label: "New enquiry", hint: "Someone asked about your work", icon: "M4 6h16v10H8l-4 4z", tone: "bg-[#eef2ff] text-[#4338ca]" },
    ...(modules.includes("stock")
      ? [{ kind: "stock", label: "Stock", hint: "Add an item or update how many you have", icon: "M4 8l8-4 8 4-8 4zM4 8v8l8 4 8-4V8", tone: "bg-warn-soft text-warn" }]
      : []),
    ...(modules.includes("loans")
      ? [{ kind: "loan", label: "Business loan", hint: "Add a loan you are paying back", icon: "M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18M12 3l9 5H3z", tone: "bg-paper text-ink" }]
      : []),
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">What happened?</h1>
      <p className="mt-1 text-muted">Tap one. It takes a few seconds.</p>
      {saved && SAVED[saved] && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft p-3 font-semibold text-brand-dark">
          <span aria-hidden>✓</span> {SAVED[saved]} Your numbers are updated.
        </p>
      )}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {buttons.map((b) => (
          <li key={b.kind}>
            <Link href={`/record/${b.kind}`} className="card flex min-h-20 items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-raised/20">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${b.tone}`} aria-hidden>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[17px] font-semibold">{b.label}</span>
                <span className="block text-sm text-muted">{b.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
