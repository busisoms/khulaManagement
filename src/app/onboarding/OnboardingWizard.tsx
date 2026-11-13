"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeOnboarding, type OnboardingInput, type OnboardingResult } from "@/app/_actions/business";
import { whatsappLink } from "@/lib/actions/executors";
import { formatRands, parseRandsToCents } from "@/lib/format";
import { CATEGORY_LABELS, GOAL_LABELS, type Category, type GrowthGoal, type RecordKeeping } from "@/types";

type Debt = { name: string; amount: string; since: "week" | "two_weeks" | "month" | "longer" };

const SINCE_LABELS: Record<Debt["since"], string> = {
  week: "This week",
  two_weeks: "About 2 weeks",
  month: "About a month",
  longer: "Longer",
};
const RECORD_LABELS: Record<RecordKeeping, string> = {
  none: "I don't write things down",
  paper: "In a notebook or on paper",
  digital: "On my phone or computer",
};

const STEPS = ["business", "area", "records", "goal", "stock", "loan", "budget", "debts"] as const;

/** One question per step. Ends with immediate value: who owes you money, and a reminder to send. */
export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [area, setArea] = useState("");
  const [recordKeeping, setRecordKeeping] = useState<RecordKeeping | "">("");
  const [goal, setGoal] = useState<GrowthGoal | "">("");
  const [hasStock, setHasStock] = useState<boolean | null>(null);
  const [hasLoan, setHasLoan] = useState<boolean | null>(null);
  const [budget, setBudget] = useState("0");
  const [debts, setDebts] = useState<Debt[]>([{ name: "", amount: "", since: "two_weeks" }]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Extract<OnboardingResult, { ok: true }> | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const current = STEPS[step];
  const next = () => {
    setError("");
    setStep((s) => s + 1);
  };

  // Stock defaults to "yes" for tailoring and retail.
  function chooseCategory(c: Category) {
    setCategory(c);
    if (hasStock === null) setHasStock(c === "tailoring" || c === "retail");
  }

  function finish() {
    const filled = debts.filter((d) => d.name.trim() || d.amount.trim());
    const parsed = filled.map((d) => ({ ...d, cents: parseRandsToCents(d.amount) }));
    if (parsed.some((d) => !d.name.trim() || d.cents === null || d.cents <= 0)) {
      setError("Each person needs a name and an amount, like 300.");
      return;
    }
    const budgetCents = parseRandsToCents(budget || "0");
    const input: OnboardingInput = {
      name: name.trim(),
      category: category as Category,
      area: area.trim(),
      recordKeeping: recordKeeping as RecordKeeping,
      growthGoal: goal as GrowthGoal,
      hasStock: Boolean(hasStock),
      hasLoan: Boolean(hasLoan),
      budgetCents: budgetCents ?? 0,
      debts: parsed.map((d) => ({ name: d.name.trim(), amountCents: d.cents!, since: d.since })),
    };
    start(async () => {
      const r = await completeOnboarding(input);
      if (r.ok) setResult(r);
      else setError(r.error);
    });
  }

  if (result) {
    return (
      <section className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold text-brand-dark">You&apos;re set up!</h1>
        {result.reminder ? (
          <>
            <div className="card">
              <p className="text-muted">Money people owe you right now</p>
              <p className="text-4xl font-bold">{formatRands(result.totalOwedCents)}</p>
            </div>
            <div className="card">
              <p className="field-label">A reminder you can send to {result.reminder.customer}</p>
              <p className="rounded-xl bg-paper p-4 whitespace-pre-wrap">{result.reminder.text}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(result.reminder!.text).catch(() => {});
                    setCopied(true);
                  }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <a className="btn-secondary" href={whatsappLink(result.reminder.text)} target="_blank" rel="noopener noreferrer">
                  Open in WhatsApp
                </a>
              </div>
              <p className="mt-3 text-sm text-muted">WhatsApp opens with the message ready. You choose the person and press send.</p>
            </div>
          </>
        ) : (
          <p className="card">Nobody owes you money right now. That&apos;s great!</p>
        )}
        <Link href="/home" className="btn-primary text-lg">
          Go to my home
        </Link>
      </section>
    );
  }

  const canContinue: Record<(typeof STEPS)[number], boolean> = {
    business: name.trim().length > 0 && category !== "",
    area: area.trim().length > 0,
    records: recordKeeping !== "",
    goal: goal !== "",
    stock: hasStock !== null,
    loan: hasLoan !== null,
    budget: parseRandsToCents(budget || "0") !== null,
    debts: true,
  };

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 h-2 rounded-full bg-line" aria-hidden>
          <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {current === "business" && (
        <>
          <h1 className="text-2xl font-bold">What is your business called?</h1>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sizwe's Repairs" aria-label="Business name" autoFocus />
          <Options legend="What kind of business is it?" options={CATEGORY_LABELS} value={category} onChange={(v) => chooseCategory(v as Category)} />
        </>
      )}
      {current === "area" && (
        <>
          <h1 className="text-2xl font-bold">Where do you work?</h1>
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Mthatha, near the taxi rank" aria-label="Area" autoFocus />
        </>
      )}
      {current === "records" && (
        <Options legend="How do you keep track of money now?" options={RECORD_LABELS} value={recordKeeping} onChange={(v) => setRecordKeeping(v as RecordKeeping)} title />
      )}
      {current === "goal" && <Options legend="What do you most want to improve?" options={GOAL_LABELS} value={goal} onChange={(v) => setGoal(v as GrowthGoal)} title />}
      {current === "stock" && (
        <Options
          legend="Do you keep stock (materials or goods to sell)?"
          options={{ yes: "Yes", no: "No" }}
          value={hasStock === null ? "" : hasStock ? "yes" : "no"}
          onChange={(v) => setHasStock(v === "yes")}
          title
        />
      )}
      {current === "loan" && (
        <Options
          legend="Are you paying back a business loan?"
          options={{ yes: "Yes", no: "No" }}
          value={hasLoan === null ? "" : hasLoan ? "yes" : "no"}
          onChange={(v) => setHasLoan(v === "yes")}
          title
        />
      )}
      {current === "budget" && (
        <>
          <h1 className="text-2xl font-bold">How much can you spend on advertising each month?</h1>
          <p className="text-muted">R0 is fine. Most ideas will be free.</p>
          <label className="block">
            <span className="field-label">Amount (R)</span>
            <input className="input" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </label>
        </>
      )}
      {current === "debts" && (
        <>
          <h1 className="text-2xl font-bold">Who owes you money right now?</h1>
          <p className="text-muted">Add up to 3 people. Leave it empty if nobody owes you.</p>
          {debts.map((d, i) => (
            <div key={i} className="card flex flex-col gap-3">
              <label className="block">
                <span className="field-label">Name</span>
                <input className="input" value={d.name} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="e.g. Mrs Khumalo" />
              </label>
              <label className="block">
                <span className="field-label">How much? (R)</span>
                <input className="input" inputMode="decimal" value={d.amount} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder="e.g. 450" />
              </label>
              <label className="block">
                <span className="field-label">Since when?</span>
                <select className="input" value={d.since} onChange={(e) => setDebts(debts.map((x, j) => (j === i ? { ...x, since: e.target.value as Debt["since"] } : x)))}>
                  {Object.entries(SINCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          {debts.length < 3 && (
            <button className="btn-secondary self-start" onClick={() => setDebts([...debts, { name: "", amount: "", since: "two_weeks" }])}>
              + Add another person
            </button>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 font-medium text-accent">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button className="btn-secondary" onClick={() => setStep(step - 1)} disabled={pending}>
            Back
          </button>
        )}
        {current === "debts" ? (
          <button className="btn-primary" onClick={finish} disabled={pending}>
            {pending ? "Setting up…" : "Finish"}
          </button>
        ) : (
          <button className="btn-primary" onClick={next} disabled={!canContinue[current]}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}

function Options({ legend, options, value, onChange, title }: { legend: string; options: Record<string, string>; value: string; onChange: (v: string) => void; title?: boolean }) {
  return (
    <fieldset>
      <legend className={title ? "mb-4 text-2xl font-bold" : "field-label"}>{legend}</legend>
      <div className="flex flex-col gap-2">
        {Object.entries(options).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base ${value === v ? "border-brand bg-brand-soft font-semibold text-brand-dark" : "border-line bg-white hover:bg-paper"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
