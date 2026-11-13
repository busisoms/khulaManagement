/**
 * Action state machine. The LLM never acts: an action only moves forward when the owner says so.
 *
 *   proposed → approved → done
 *   proposed → dismissed
 *   approved → cancelled
 *
 * Invalid transitions throw. Every transition writes an AuditEvent.
 */
import { db } from "@/lib/db";
import type { ActionStatus } from "@/types";

export const TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  proposed: ["approved", "dismissed"],
  approved: ["done", "cancelled"],
  done: [],
  dismissed: [],
  cancelled: [],
};

/** After this many days, a done action asks the owner what happened. */
export const OUTCOME_PROMPT_DAYS = 7;

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Cannot move an action from "${from}" to "${to}"`);
  }
}

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from as ActionStatus] ?? []).includes(to as ActionStatus);
}

/** Returns the new status or throws. Pure. */
export function nextStatus(from: string, to: string): ActionStatus {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  return to as ActionStatus;
}

/** Done actions without an outcome note, completed at least OUTCOME_PROMPT_DAYS ago. */
export function needsOutcome(a: { status: string; completedAt: Date | null; outcomeNote: string | null }, now = new Date()): boolean {
  if (a.status !== "done" || !a.completedAt || a.outcomeNote) return false;
  return now.getTime() - a.completedAt.getTime() >= OUTCOME_PROMPT_DAYS * 24 * 60 * 60 * 1000;
}

/** Move an action to a new status, update timestamps and write an audit event. */
export async function transitionAction(actionId: string, to: ActionStatus, details: Record<string, unknown> = {}) {
  const action = await db.action.findUniqueOrThrow({ where: { id: actionId } });
  const status = nextStatus(action.status, to);
  const now = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.action.update({
      where: { id: actionId },
      data: {
        status,
        ...(status === "approved" ? { approvedAt: now } : {}),
        ...(status === "done" ? { completedAt: now } : {}),
      },
    });
    await tx.auditEvent.create({
      data: { businessId: action.businessId, actionId, eventType: status, timestamp: now, details: JSON.stringify(details) },
    });
    return updated;
  });
}

/** Create an action in "proposed" state from a recommendation (with its audit event). */
export async function createAction(opts: { businessId: string; recommendationId: string; type: string; payload: Record<string, unknown> }) {
  return db.$transaction(async (tx) => {
    const action = await tx.action.create({
      data: {
        businessId: opts.businessId,
        recommendationId: opts.recommendationId,
        type: opts.type,
        payload: JSON.stringify(opts.payload),
        status: "proposed",
      },
    });
    await tx.auditEvent.create({ data: { businessId: opts.businessId, actionId: action.id, eventType: "proposed", details: "{}" } });
    return action;
  });
}

export async function recordOutcome(actionId: string, note: string) {
  const action = await db.action.findUniqueOrThrow({ where: { id: actionId } });
  if (action.status !== "done") throw new Error("Only done actions can have an outcome");
  await db.$transaction([
    db.action.update({ where: { id: actionId }, data: { outcomeNote: note } }),
    db.auditEvent.create({ data: { businessId: action.businessId, actionId, eventType: "outcome_recorded", details: JSON.stringify({ note }) } }),
  ]);
}
