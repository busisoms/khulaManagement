import Link from "next/link";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  proposed: { text: "Suggested", className: "bg-paper text-muted" },
  approved: { text: "To do", className: "bg-warn-soft text-warn" },
  done: { text: "Done", className: "bg-brand-soft text-brand-dark" },
  dismissed: { text: "Skipped", className: "bg-paper text-muted" },
  cancelled: { text: "Cancelled", className: "bg-paper text-muted" },
};

const STATUS_ICON: Record<string, string> = {
  done: "M5 10.5 8.5 14 15 7",
  approved: "M10 5v5l3 2",
};

type ActionRow = { id: string; status: string; payload: string; createdAt: Date; completedAt: Date | null; outcomeNote: string | null };

/** Actions shown like a transaction list: one card, divided rows. */
export function ActionList({ actions, empty }: { actions: ActionRow[]; empty: string }) {
  if (actions.length === 0) return <p className="card text-muted">{empty}</p>;
  return (
    <ul className="card divide-y divide-line p-0">
      {actions.map((a) => {
        const title = (JSON.parse(a.payload).title as string) || "Action";
        const status = STATUS_LABEL[a.status] ?? STATUS_LABEL.proposed;
        return (
          <li key={a.id}>
            <Link href={`/actions/${a.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${status.className}`} aria-hidden>
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={STATUS_ICON[a.status] ?? "M6 10h8"} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{title}</span>
                <span className="block truncate text-sm text-muted">
                  {a.completedAt ? `Done ${formatDate(a.completedAt)}` : `Started ${formatDate(a.createdAt)}`}
                  {a.outcomeNote ? ` · ${a.outcomeNote}` : ""}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>{status.text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
