import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { needsOutcome } from "@/lib/actions/state";
import { ActionList } from "@/components/ActionList";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const businessId = (await getCurrentBusinessId())!;
  const actions = await db.action.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const todo = actions.filter((a) => a.status === "approved" || a.status === "proposed");
  const done = actions.filter((a) => a.status === "done");
  const closed = actions.filter((a) => a.status === "dismissed" || a.status === "cancelled");
  const askOutcome = done.filter((a) => needsOutcome(a));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Your actions</h1>
        <p className="mt-1 text-muted">Steps you approved. You do them yourself; nothing is sent for you.</p>
      </div>
      {askOutcome.length > 0 && (
        <p className="rounded-xl bg-warn-soft p-3">
          {askOutcome.length === 1 ? "One finished action is" : `${askOutcome.length} finished actions are`} waiting for you to say how it went.
        </p>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">To do ({todo.length})</h2>
        <ActionList actions={todo} empty="Nothing to do right now. Approve a suggestion on Home." />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Done ({done.length})</h2>
        <ActionList actions={done} empty="Nothing finished yet." />
      </section>
      {closed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Skipped or cancelled ({closed.length})</h2>
          <ActionList actions={closed} empty="" />
        </section>
      )}
    </div>
  );
}
