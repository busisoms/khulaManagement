import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { needsOutcome } from "@/lib/actions/state";
import { doneLabel, EXECUTOR_KIND, OUTCOME_QUESTION } from "@/lib/actions/executors";
import { formatDate } from "@/lib/format";
import { parseModules } from "@/types";
import { ActionExecutor } from "@/components/ActionExecutor";
import { OutcomeForm } from "@/components/OutcomeForm";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<string, string> = {
  proposed: "Suggested",
  approved: "You approved it",
  done: "You marked it done",
  dismissed: "Skipped",
  cancelled: "You cancelled it",
  outcome_recorded: "You noted what happened",
};

export default async function ActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = (await getCurrentBusinessId())!;
  const action = await db.action.findFirst({
    where: { id, businessId },
    include: { auditEvents: { orderBy: { timestamp: "asc" } }, recommendation: true, business: true },
  });
  if (!action) notFound();
  const payload = JSON.parse(action.payload) as { title?: string; text?: string; checklist?: string[] };
  const modules = parseModules(action.business.modules);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/actions" className="text-brand underline underline-offset-2">
        ← All actions
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{payload.title || "Action"}</h1>
        <p className="mt-2 text-lg">{action.recommendation.finding}</p>
      </div>

      {action.status === "approved" && (
        <ActionExecutor
          actionId={action.id}
          kind={EXECUTOR_KIND[action.type] ?? "record"}
          initialText={payload.text ?? ""}
          checklist={payload.checklist ?? []}
          doneLabel={doneLabel(action.type)}
          businessName={action.business.name}
          recordLinks={[
            { href: "/record/sale", label: "I made a sale" },
            { href: "/record/payment", label: "Someone paid me" },
            { href: "/record/expense", label: "I spent money" },
            ...(modules.includes("reach") ? [{ href: "/record/enquiry", label: "New enquiry" }] : []),
          ]}
        />
      )}

      {action.status === "done" && (
        <section className="card">
          <p className="font-semibold text-brand-dark">✓ Done{action.completedAt ? ` on ${formatDate(action.completedAt)}` : ""}</p>
          {payload.text && <p className="mt-3 rounded-xl bg-paper p-4 whitespace-pre-wrap">{payload.text}</p>}
          {action.outcomeNote ? (
            <p className="mt-4">
              <span className="font-semibold">What happened:</span> {action.outcomeNote}
            </p>
          ) : (
            <OutcomeForm
              actionId={action.id}
              question={OUTCOME_QUESTION[action.type] ?? "What happened?"}
              prompted={needsOutcome(action)}
            />
          )}
        </section>
      )}

      {(action.status === "dismissed" || action.status === "cancelled") && (
        <p className="card text-muted">This action was {action.status === "dismissed" ? "skipped" : "cancelled"}.</p>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">History</h2>
        <ol className="flex flex-col gap-1 text-muted">
          {action.auditEvents.map((e) => (
            <li key={e.id}>
              {formatDate(e.timestamp)} · {EVENT_LABEL[e.eventType] ?? e.eventType}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
