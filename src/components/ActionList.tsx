import Link from "next/link";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  proposed: { text: "Suggested", className: "bg-paper text-muted" },
  approved: { text: "To do", className: "bg-accent-soft text-accent" },
  done: { text: "Done", className: "bg-brand-soft text-brand-dark" },
  dismissed: { text: "Skipped", className: "bg-paper text-muted" },
  cancelled: { text: "Cancelled", className: "bg-paper text-muted" },
};

type ActionRow = { id: string; status: string; payload: string; createdAt: Date; completedAt: Date | null; outcomeNote: string | null };

export function ActionList({ actions, empty }: { actions: ActionRow[]; empty: string }) {
  if (actions.length === 0) return <p className="card text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {actions.map((a) => {
        const title = (JSON.parse(a.payload).title as string) || "Action";
        const status = STATUS_LABEL[a.status] ?? STATUS_LABEL.proposed;
        return (
          <li key={a.id}>
            <Link href={`/actions/${a.id}`} className="card flex min-h-11 items-center justify-between gap-3 p-4 hover:border-brand/40">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{title}</span>
                <span className="block text-sm text-muted">
                  {a.completedAt ? `Done ${formatDate(a.completedAt)}` : `Started ${formatDate(a.createdAt)}`}
                  {a.outcomeNote ? ` · ${a.outcomeNote}` : ""}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>{status.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
