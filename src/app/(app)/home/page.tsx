import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { loadBusinessData } from "@/lib/data";
import { growthScore, STAGE_LABELS } from "@/lib/growth/score";
import { income, lastNDays, owed, PERIOD_DAYS, profit, futureRecords, recordDates } from "@/lib/metrics";
import { formatRands } from "@/lib/format";
import { homeRecommendation } from "@/lib/recommendation-view";
import { needsOutcome } from "@/lib/actions/state";
import { GrowthTree } from "@/components/GrowthTree";
import { RecommendationCard } from "@/components/RecommendationCard";
import { NewSuggestionButton } from "@/components/NewSuggestionButton";
import { ActionList } from "@/components/ActionList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const businessId = (await getCurrentBusinessId())!;
  const now = new Date();
  const data = await loadBusinessData(businessId);
  const period = lastNDays(now, PERIOD_DAYS);
  const actions = await db.action.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const done = actions.filter((a) => a.status === "done").length;

  const growth = growthScore(data, done, now);
  const incomeCents = income(data.sales, period, now).cents;
  const profitCents = profit(data.sales, data.expenses, period, now).cents;
  const owedCents = owed(data.sales, now).cents;
  const future = futureRecords(recordDates(data.sales, data.expenses, data.enquiries), now);
  const rec = await homeRecommendation(businessId);
  const outcomeDue = actions.filter((a) => needsOutcome(a, now));

  const growthLine =
    growth.stage === "seed"
      ? "Collecting your starting point."
      : growth.pct === null
        ? "Compared with your first month."
        : `${growth.pct >= 0 ? "Up" : "Down"} ${Math.abs(growth.pct)}% compared with your first month.`;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start">
      <div className="flex flex-col gap-6">
        <section className="card text-center" aria-labelledby="tree-title">
          <h1 id="tree-title" className="text-sm font-semibold tracking-wide text-muted uppercase">
            Your business tree
          </h1>
          <GrowthTree stage={growth.stage} waterings={growth.watering.completedActions + growth.watering.daysWithRecords} label={`Growth stage: ${STAGE_LABELS[growth.stage]}`} />
          <p className="text-2xl font-bold text-brand-dark">{STAGE_LABELS[growth.stage]}</p>
          <p className="mt-1 text-lg">{growthLine}</p>
          <p className="mt-3 text-sm text-muted">{growth.rule}</p>
          <p className="mt-1 text-sm text-muted">
            Watered by {growth.watering.daysWithRecords} days of records and {growth.watering.completedActions} completed action
            {growth.watering.completedActions === 1 ? "" : "s"}. Watering helps you see progress, but only your numbers grow the tree.
          </p>
        </section>

        <section aria-labelledby="numbers-title">
          <h2 id="numbers-title" className="mb-3 text-lg font-bold">
            Last 4 weeks
          </h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
            <Stat label="Money in" value={formatRands(incomeCents)} hint="Payments you received" />
            <Stat label="Profit" value={formatRands(profitCents)} hint="Money in minus money spent" negative={profitCents < 0} />
            <Stat label="Owed to you" value={formatRands(owedCents)} hint="Customers still to pay" />
          </dl>
          {future > 0 && (
            <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm">
              {future} record{future === 1 ? " has" : "s have"} a date in the future and {future === 1 ? "is" : "are"} not counted yet.
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-6">
        {outcomeDue.length > 0 && (
          <section className="card bg-warn-soft">
            <h2 className="font-bold">How did it go?</h2>
            <p className="mt-1">You finished {outcomeDue.length === 1 ? "an action" : `${outcomeDue.length} actions`} a week ago. Tell me what happened.</p>
            <Link className="btn-secondary mt-3" href={`/actions/${outcomeDue[0].id}`}>
              Add what happened
            </Link>
          </section>
        )}

        {rec ? (
          <RecommendationCard rec={rec} />
        ) : (
          <section className="card">
            <h2 className="text-xl font-bold">You&apos;re up to date</h2>
            <p className="mt-2">You&apos;ve answered today&apos;s suggestion. Record new sales or payments, or ask for another idea.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <NewSuggestionButton label="Give me another idea" />
              <Link href="/record" className="btn-secondary">
                Record something
              </Link>
            </div>
          </section>
        )}

        <section aria-labelledby="recent-title">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent-title" className="text-lg font-bold">
              Recent actions
            </h2>
            <Link href="/actions" className="text-brand underline underline-offset-2">
              See all
            </Link>
          </div>
          <ActionList actions={actions.slice(0, 3)} empty="No actions yet. Approve a suggestion to start." />
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, negative }: { label: string; value: string; hint: string; negative?: boolean }) {
  return (
    <div className="card p-4">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${negative ? "text-accent" : ""}`}>{value}</dd>
      <dd className="text-sm text-muted">{hint}</dd>
    </div>
  );
}
