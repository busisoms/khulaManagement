"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWriteAccess } from "@/lib/auth";
import { getCurrentBusinessId } from "@/lib/business";
import { createRecommendation, parseEvidence } from "@/lib/advisor";
import { createAction, recordOutcome, transitionAction } from "@/lib/actions/state";
import { checklistFor } from "@/lib/actions/executors";

async function ownedRecommendation(id: string) {
  const businessId = await getCurrentBusinessId();
  const rec = await db.recommendation.findFirst({ where: { id, businessId: businessId ?? "" } });
  if (!rec) throw new Error("Recommendation not found");
  return rec;
}

async function ownedAction(id: string) {
  const businessId = await getCurrentBusinessId();
  const action = await db.action.findFirst({ where: { id, businessId: businessId ?? "" } });
  if (!action) throw new Error("Action not found");
  return action;
}

/** Owner approves a suggestion (possibly with edited text). Creates the action: proposed → approved. */
export async function approveRecommendation(recommendationId: string, draftText: string) {
  await requireWriteAccess("/home");
  const rec = await ownedRecommendation(recommendationId);
  if (rec.status !== "proposed") redirect("/actions");
  const text = draftText.slice(0, 600);
  const evidence = parseEvidence(rec.evidence);
  const action = await createAction({
    businessId: rec.businessId,
    recommendationId: rec.id,
    type: rec.actionType,
    payload: {
      title: evidence.title,
      text,
      edited: text !== rec.draftText,
      ...(rec.actionType === "expense_review" ? { checklist: checklistFor(evidence.title) } : {}),
      // Who the reminder is for, so the report can look for a payment afterwards.
      ...(rec.actionType === "payment_reminder" ? { customer: String(evidence.items[0]?.label ?? "").replace(/^Owed by /, "") } : {}),
    },
  });
  await transitionAction(action.id, "approved", { edited: text !== rec.draftText });
  await db.recommendation.update({ where: { id: rec.id }, data: { status: "accepted" } });
  revalidatePath("/", "layout");
  redirect(`/actions/${action.id}`);
}

/** "Not now". */
export async function dismissRecommendation(recommendationId: string) {
  await requireWriteAccess("/home");
  const rec = await ownedRecommendation(recommendationId);
  await db.recommendation.update({ where: { id: rec.id }, data: { status: "dismissed" } });
  revalidatePath("/", "layout");
}

/** "Give me a new suggestion". */
export async function newRecommendation() {
  await requireWriteAccess("/home");
  const businessId = await getCurrentBusinessId();
  if (!businessId) redirect("/onboarding");
  await db.recommendation.updateMany({ where: { businessId, status: "proposed" }, data: { status: "dismissed" } });
  await createRecommendation(businessId);
  revalidatePath("/", "layout");
}

/** Owner says "I sent it" / "I did it". */
export async function markActionDone(actionId: string, finalText?: string, details: Record<string, unknown> = {}) {
  await requireWriteAccess(`/actions/${actionId}`);
  const action = await ownedAction(actionId);
  if (finalText !== undefined) {
    const payload = { ...JSON.parse(action.payload), text: finalText.slice(0, 600) };
    await db.action.update({ where: { id: action.id }, data: { payload: JSON.stringify(payload) } });
  }
  await transitionAction(action.id, "done", details);
  revalidatePath("/", "layout");
}

export async function cancelAction(actionId: string) {
  await requireWriteAccess(`/actions/${actionId}`);
  const action = await ownedAction(actionId);
  await transitionAction(action.id, "cancelled");
  revalidatePath("/", "layout");
}

export async function saveOutcome(actionId: string, note: string) {
  await requireWriteAccess(`/actions/${actionId}`);
  const action = await ownedAction(actionId);
  const clean = note.trim().slice(0, 300);
  if (!clean) return;
  await recordOutcome(action.id, clean);
  revalidatePath("/", "layout");
}
