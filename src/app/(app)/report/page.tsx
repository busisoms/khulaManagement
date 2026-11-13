import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { loadBusinessData } from "@/lib/data";
import { buildReport, CHART_MIN_COVERAGE_DAYS } from "@/lib/report";
import { addDays } from "@/lib/metrics";
import { formatDate, formatRands } from "@/lib/format";
import { parseEvidence } from "@/lib/advisor";
import { EXPENSE_LABELS, type ExpenseCategory } from "@/types";
import { WeeklyChart } from "@/components/WeeklyChart";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const businessId = (await getCurrentBusinessId())!;
  const data = await loadBusinessData(businessId);
  const actions = await db.action.findMany({ where: { businessId }, orderBy: { completedAt: "desc" } });
  const report = buildReport(data, actions);
  const next = await db.recommendation.findFirst({ where: { businessId, status: "proposed" }, orderBy: { createdAt: "desc" } });

  const range = `${formatDate(report.period.start)} – ${formatDate(addDays(report.period.end, -1))}`;
  const nothingYet = report.rows.every((r) => r.current === 0 && r.previous === 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Your monthly report</h1>
        <p className="mt-1 text-muted">
          Last 4 weeks ({range}) compared with the 4 weeks before.
        </p>
      </div>

      {nothingYet ? (
        <p className="card">
          There&apos;s nothing to compare yet. Record your sales and spending for a few weeks and your report will appear here.{" "}
          <Link href="/record" className="text-brand underline">
            Record something now
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
          <section className="card" aria-labelledby="changed">
            <h2 id="changed" className="text-lg font-bold">
              What changed
            </h2>
            <table className="mt-3 w-full text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="py-1 font-medium"></th>
                  <th className="py-1 text-right font-medium">Before</th>
                  <th className="py-1 text-right font-medium">Now</th>
                  <th className="py-1 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const fmt = (v: number) => (r.money ? formatRands(v) : String(v));
                  const better = r.change === 0 ? null : r.change > 0 === r.goodWhenUp;
                  return (
                    <tr key={r.label} className="border-t border-line">
                      <th className="py-2 font-semibold">{r.label}</th>
                      <td className="py-2 pl-3 text-right">{fmt(r.previous)}</td>
                      <td className="py-2 pl-3 text-right font-semibold">{fmt(r.current)}</td>
                      <td className={`py-2 pl-3 text-right whitespace-nowrap ${better === null ? "text-muted" : better ? "text-brand" : "text-accent"}`}>
                        {r.change > 0 ? "▲" : r.change < 0 ? "▼" : ""} {r.pct === null ? (r.change === 0 ? "same" : "new") : `${Math.abs(r.pct)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-muted">Customers still owe you {formatRands(report.owedCents)} in total.</p>
            {report.largestExpense && (
              <p className="mt-1 text-muted">
                Your biggest cost was {EXPENSE_LABELS[report.largestExpense.category as ExpenseCategory]?.toLowerCase() ?? report.largestExpense.category} (
                {formatRands(report.largestExpense.cents)}).
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="weeks">
            <h2 id="weeks" className="text-lg font-bold">
              Week by week
            </h2>
            {report.showCharts ? (
              <div className="mt-3">
                <WeeklyChart weeks={report.weeks} />
              </div>
            ) : (
              <p className="mt-2 text-muted">
                Not enough records for a chart yet: you have records on {report.coverage} of the last 28 days. The chart appears at {CHART_MIN_COVERAGE_DAYS} days.
              </p>
            )}
          </section>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <section className="card" aria-labelledby="taken">
          <h2 id="taken" className="text-lg font-bold">
            Actions you took
          </h2>
          {report.recentDone.length === 0 ? (
            <p className="mt-2 text-muted">No actions finished in the last 4 weeks.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {report.recentDone.map((a, i) => (
                <li key={i}>
                  <span className="font-semibold">{JSON.parse(a.payload).title || "Action"}</span> — {formatDate(a.completedAt!)}
                  {a.outcomeNote && <span className="block text-muted">{a.outcomeNote}</span>}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-5 font-bold">What seemed to help</h3>
          {report.associations.length === 0 ? (
            <p className="mt-1 text-muted">Nothing to show yet. Finish an action and keep recording to see what changes after it.</p>
          ) : (
            <>
              <ul className="mt-1 list-disc pl-5">
                {report.associations.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted">These happened after your actions. Other things may also have played a part.</p>
            </>
          )}
        </section>

        <section className="card border-brand/30" aria-labelledby="next">
          <h2 id="next" className="text-lg font-bold">
            Next step
          </h2>
          {next ? (
            <>
              <p className="mt-2 font-semibold">{parseEvidence(next.evidence).title}</p>
              <p className="mt-1">{next.finding}</p>
            </>
          ) : (
            <p className="mt-2">See Home for your next suggestion.</p>
          )}
          <Link href="/home" className="btn-primary mt-4">
            Go to Home
          </Link>
        </section>
      </div>
    </div>
  );
}
