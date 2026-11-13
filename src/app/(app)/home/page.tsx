import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { loadBusinessData } from "@/lib/data";
import { growthScore, STAGE_LABELS, STAGE_THRESHOLDS, type Stage } from "@/lib/growth/score";
import { lastNDays, overdue, owed, PERIOD_DAYS, previousPeriod, profit, trend, futureRecords, recordDates } from "@/lib/metrics";
import { formatRands } from "@/lib/format";
import { homeRecommendation } from "@/lib/recommendation-view";
import { needsOutcome } from "@/lib/actions/state";
import { GrowthTree, STAGE_ORDER } from "@/components/GrowthTree";
import { RecommendationCard } from "@/components/RecommendationCard";
import { NewSuggestionButton } from "@/components/NewSuggestionButton";
import { ActionList } from "@/components/ActionList";

export const dynamic = "force-dynamic";

/** % the goal metric must reach for the next stage (null at the top or without a baseline). */
function nextStageTarget(stage: Stage): { stage: Stage; pct: number } | null {
  if (stage === "sprout") return { stage: "sapling", pct: STAGE_THRESHOLDS.sapling };
  if (stage === "sapling") return { stage: "young_tree", pct: STAGE_THRESHOLDS.young_tree };
  if (stage === "young_tree") return { stage: "thriving", pct: STAGE_THRESHOLDS.thriving };
  return null;
}

export default async function HomePage() {
  const businessId = (await getCurrentBusinessId())!;
  const now = new Date();
  const data = await loadBusinessData(businessId);
  const period = lastNDays(now, PERIOD_DAYS);
  const actions = await db.action.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const done = actions.filter((a) => a.status === "done").length;

  const growth = growthScore(data, done, now);
  const p = profit(data.sales, data.expenses, period, now);
  const pp = profit(data.sales, data.expenses, previousPeriod(period), now);
  const profitTrend = trend(p.cents, pp.cents);
  const owedNow = owed(data.sales, now);
  const overdueNow = overdue(data.sales, now);
  const future = futureRecords(recordDates(data.sales, data.expenses, data.enquiries), now);
  const rec = await homeRecommendation(businessId);
  const outcomeDue = actions.filter((a) => needsOutcome(a, now));

  const stageIndex = STAGE_ORDER.indexOf(growth.stage);
  const target = nextStageTarget(growth.stage);
  const growthLine =
    growth.stage === "seed"
      ? "Collecting your starting point"
      : growth.pct === null
        ? "Compared with your first month"
        : `${growth.pct >= 0 ? "+" : "−"}${Math.abs(growth.pct)}% vs your first month`;

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- balance card ---------- */}
      <section className="card-navy" aria-labelledby="profit-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p id="profit-title" className="text-sm font-medium text-white/70">
              Profit · last 4 weeks
            </p>
            <p className={`num mt-1 text-5xl font-semibold md:text-6xl ${p.cents < 0 ? "text-[#fda29b]" : ""}`}>{formatRands(p.cents)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              {profitTrend.pct !== null && (
                <span className={profitTrend.change >= 0 ? "pill-up" : "pill-down"}>
                  {profitTrend.change >= 0 ? "▲" : "▼"} {Math.abs(profitTrend.pct)}%
                </span>
              )}
              <span>vs the 4 weeks before ({formatRands(pp.cents)})</span>
            </div>
          </div>
          <Link href="/report" className="hidden rounded-xl bg-white/10 sm:inline-flex px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/15">
            See report
          </Link>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
          <Mini label="Money in" value={formatRands(p.incomeCents)} />
          <Mini label="Money spent" value={formatRands(p.expensesCents)} />
          <Mini
            label="Owed to you"
            value={formatRands(owedNow.cents)}
            note={overdueNow.items.length > 0 ? `${formatRands(overdueNow.cents)} overdue` : undefined}
          />
        </dl>
      </section>

      {future > 0 && (
        <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
          {future} record{future === 1 ? " has" : "s have"} a date in the future and {future === 1 ? "is" : "are"} not counted yet.
        </p>
      )}

      {outcomeDue.length > 0 && (
        <section className="card flex flex-wrap items-center justify-between gap-3 ring-warn/30">
          <div>
            <p className="font-semibold">How did it go?</p>
            <p className="text-muted">
              You finished {outcomeDue.length === 1 ? "an action" : `${outcomeDue.length} actions`} a week ago. Tell me what happened.
            </p>
          </div>
          <Link className="btn-secondary" href={`/actions/${outcomeDue[0].id}`}>
            Add what happened
          </Link>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* ---------- growth card ---------- */}
        <section className="card overflow-hidden p-0" aria-labelledby="tree-title">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 id="tree-title" className="eyebrow">
              Business growth
            </h2>
            <span className="chip text-xs">Goal: {growth.goal === "customers" ? "more customers" : growth.goal === "cash_collected" ? "get paid" : "profit"}</span>
          </div>

          <div className="bg-gradient-to-b from-white to-brand-soft/60 px-5 pt-2 pb-4">
            <GrowthTree stage={growth.stage} label={`Growth stage: ${STAGE_LABELS[growth.stage]}`} />
            <div className="text-center">
              <p className="text-2xl font-semibold tracking-tight">{STAGE_LABELS[growth.stage]}</p>
              <p className={`num mt-1 font-semibold ${growth.pct !== null && growth.pct < 0 ? "text-accent" : "text-brand"}`}>{growthLine}</p>
            </div>
          </div>

          <div className="border-t border-line px-5 py-4">
            <ol className="flex items-center gap-1.5" aria-label="Growth stages">
              {STAGE_ORDER.map((s, i) => (
                <li key={s} className="flex-1" title={STAGE_LABELS[s]}>
                  <span className={`block h-1.5 rounded-full ${i <= stageIndex ? "bg-brand" : "bg-line"}`} />
                  <span className={`mt-1.5 block text-center text-[11px] ${i === stageIndex ? "font-semibold text-ink" : "text-muted"}`}>
                    {STAGE_LABELS[s].replace(" tree", "")}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted">
              {target && growth.pct !== null
                ? `Reach +${target.pct}% to become a ${STAGE_LABELS[target.stage].toLowerCase()}. `
                : ""}
              {growth.rule}
            </p>
            <p className="mt-2 text-xs text-muted">
              Watered by {growth.watering.daysWithRecords} days of records and {growth.watering.completedActions} completed action
              {growth.watering.completedActions === 1 ? "" : "s"}. Only your numbers grow the tree.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          {rec ? (
            <RecommendationCard rec={rec} />
          ) : (
            <section className="card">
              <p className="eyebrow">Next step</p>
              <h2 className="mt-1 text-xl font-semibold">You&apos;re up to date</h2>
              <p className="mt-2 text-muted">You&apos;ve answered today&apos;s suggestion. Record new sales or payments, or ask for another idea.</p>
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
              <h2 id="recent-title" className="text-lg font-semibold">
                Recent actions
              </h2>
              <Link href="/actions" className="text-sm font-semibold text-brand hover:underline">
                See all
              </Link>
            </div>
            <ActionList actions={actions.slice(0, 3)} empty="No actions yet. Approve a suggestion to start." />
          </section>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs font-medium text-white/60 sm:text-sm">{label}</dt>
      <dd className="num mt-0.5 truncate text-lg font-semibold sm:text-2xl">{value}</dd>
      {note && <dd className="truncate text-xs font-medium text-[#fdb022]">{note}</dd>}
    </div>
  );
}
