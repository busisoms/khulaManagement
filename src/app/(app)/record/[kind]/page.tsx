import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { loadBusinessData } from "@/lib/data";
import { outstandingCents } from "@/lib/metrics";
import { formatDate, formatRands } from "@/lib/format";
import { recordEnquiry, recordExpense, recordLoan, recordPayment, recordSale, recordStock } from "@/app/_actions/record";
import { ActionForm } from "@/components/ActionForm";
import { EXPENSE_LABELS, PAYMENT_METHOD_LABELS, SOURCE_LABELS } from "@/types";

export const dynamic = "force-dynamic";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Big tappable radio buttons. */
function Choice({ name, legend, options, defaultValue }: { name: string; legend: string; options: Record<string, string>; defaultValue: string }) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label key={value} className="cursor-pointer">
            <input type="radio" name={name} value={value} defaultChecked={value === defaultValue} className="peer sr-only" />
            <span className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 py-2 peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold peer-checked:text-brand-dark peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Text({ name, label, placeholder, required, type = "text", inputMode, defaultValue, list }: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  inputMode?: "decimal" | "numeric" | "text";
  defaultValue?: string;
  list?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input name={name} type={type} className="input" placeholder={placeholder} required={required} inputMode={inputMode} defaultValue={defaultValue} list={list} />
    </label>
  );
}

const Money = ({ name = "amount", label = "How much? (R)" }: { name?: string; label?: string }) => (
  <Text name={name} label={label} placeholder="e.g. 250" inputMode="decimal" required />
);

/** Date defaults to today; tucked away because most records happen today. */
const OtherDay = () => (
  <details>
    <summary className="min-h-11 cursor-pointer py-2 text-brand underline underline-offset-2">It wasn&apos;t today</summary>
    <label className="mt-2 block">
      <span className="field-label">Date</span>
      <input name="date" type="date" className="input" defaultValue={today()} max={today()} />
    </label>
  </details>
);

export default async function RecordKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const businessId = (await getCurrentBusinessId())!;

  let title: string;
  let form: React.ReactNode;

  switch (kind) {
    case "sale": {
      const customers = await db.customer.findMany({ where: { businessId }, orderBy: { name: "asc" }, select: { name: true } });
      title = "I made a sale";
      form = (
        <ActionForm action={recordSale} submitLabel="Save sale">
          <Money />
          <Text name="description" label="What was it?" placeholder="e.g. Hem trousers" required />
          <Text name="customer" label="Customer name (optional)" placeholder="e.g. Lindiwe M." list="customers" />
          <datalist id="customers">
            {customers.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
          <Choice name="source" legend="How did they find you?" options={SOURCE_LABELS} defaultValue="referral" />
          <Choice name="paid" legend="Did they pay?" options={{ full: "Yes, paid in full", none: "Not yet" }} defaultValue="full" />
          <OtherDay />
        </ActionForm>
      );
      break;
    }
    case "payment": {
      const data = await loadBusinessData(businessId);
      const open = data.sales
        .map((s) => ({ s, owed: outstandingCents(s) }))
        .filter((x) => x.owed > 0)
        .sort((a, b) => a.s.date.getTime() - b.s.date.getTime());
      title = "Someone paid me";
      form =
        open.length === 0 ? (
          <div className="card">
            <p>Nobody owes you money right now. 🎉</p>
            <p className="mt-2 text-muted">If someone paid for new work, record it as a sale instead.</p>
            <Link href="/record/sale" className="btn-primary mt-4">
              Record a sale
            </Link>
          </div>
        ) : (
          <ActionForm action={recordPayment} submitLabel="Save payment">
            <label className="block">
              <span className="field-label">Who paid?</span>
              <select name="saleId" className="input" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {open.map(({ s, owed }) => (
                  <option key={s.id} value={s.id}>
                    {s.customerName ?? "Customer"} — {s.description} ({formatRands(owed)} owed, {formatDate(s.date)})
                  </option>
                ))}
              </select>
            </label>
            <Money />
            <Choice name="method" legend="How did they pay?" options={PAYMENT_METHOD_LABELS} defaultValue="cash" />
            <OtherDay />
          </ActionForm>
        );
      break;
    }
    case "expense":
      title = "I spent money";
      form = (
        <ActionForm action={recordExpense} submitLabel="Save spending">
          <Money />
          <Choice name="category" legend="What for?" options={EXPENSE_LABELS} defaultValue="materials" />
          <Text name="note" label="Note (optional)" placeholder="e.g. Thread and zips" />
          <OtherDay />
        </ActionForm>
      );
      break;
    case "enquiry":
      title = "New enquiry";
      form = (
        <ActionForm action={recordEnquiry} submitLabel="Save enquiry">
          <Choice name="source" legend="How did they find you?" options={SOURCE_LABELS} defaultValue="referral" />
          <Choice name="converted" legend="Did they become a customer?" options={{ yes: "Yes", no: "Not (yet)" }} defaultValue="no" />
          <Text name="note" label="What did they ask about? (optional)" placeholder="e.g. Wedding dress quote" />
          <OtherDay />
        </ActionForm>
      );
      break;
    case "stock": {
      const items = await db.stockItem.findMany({ where: { businessId }, orderBy: { name: "asc" } });
      title = "Stock";
      form = (
        <>
          {items.length > 0 && (
            <div className="card mb-5">
              <p className="font-semibold">What you have now</p>
              <ul className="mt-2 text-muted">
                {items.map((i) => (
                  <li key={i.id}>
                    {i.name}: {i.quantity} {i.unit}
                    {i.quantity === 1 ? "" : "s"} · {formatRands(i.unitCostCents)} each
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted">Type the same name to update an item.</p>
            </div>
          )}
          <ActionForm action={recordStock} submitLabel="Save stock">
            <Text name="name" label="Item" placeholder="e.g. Shweshwe fabric" required list="stock-items" />
            <datalist id="stock-items">
              {items.map((i) => (
                <option key={i.id} value={i.name} />
              ))}
            </datalist>
            <Text name="quantity" label="How many do you have now?" type="number" inputMode="numeric" required />
            <Text name="unit" label="Counted in" placeholder="e.g. bolt, metre, item" defaultValue="item" />
            <Money name="unitCost" label="Cost of one (R)" />
          </ActionForm>
        </>
      );
      break;
    }
    case "loan":
      title = "Business loan";
      form = (
        <ActionForm action={recordLoan} submitLabel="Save loan">
          <Text name="lender" label="Who lent you the money?" placeholder="e.g. Equipment finance" required />
          <Money name="balance" label="How much is still left to pay? (R)" />
          <Money name="instalment" label="Each payment (R)" />
          <Text name="nextDueDate" label="Next payment due" type="date" required />
        </ActionForm>
      );
      break;
    default:
      notFound();
  }

  return (
    <div className="max-w-xl">
      <Link href="/record" className="text-brand underline underline-offset-2">
        ← Back
      </Link>
      <h1 className="mt-3 mb-5 text-2xl font-bold">{title}</h1>
      {form}
    </div>
  );
}
