"use client";

import { useState, useTransition } from "react";
import { approveRecommendation, dismissRecommendation } from "@/app/_actions/advice";

export type RecommendationView = {
  id: string;
  title: string;
  finding: string;
  why: string;
  chips: { label: string; value: string }[];
  draftText: string;
  actionType: string;
  origin: string;
};

export function RecommendationCard({ rec }: { rec: RecommendationView }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(rec.draftText);
  const [pending, start] = useTransition();
  const hasDraft = rec.draftText.length > 0;

  return (
    <section className="card border-brand/30" aria-labelledby="rec-title">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">Your next step</p>
      <h2 id="rec-title" className="mt-1 text-xl font-bold">
        {rec.title}
      </h2>
      <p className="mt-3 text-lg leading-relaxed">{rec.finding}</p>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="The numbers behind this">
        {rec.chips.map((c) => (
          <li key={c.label} className="chip">
            {c.label}: <strong>{c.value}</strong>
          </li>
        ))}
      </ul>
      {rec.why && <p className="mt-3 text-muted">{rec.why}</p>}

      {hasDraft && (
        <div className="mt-4">
          <p className="field-label">{rec.actionType.endsWith("reminder") ? "Message you can send" : "Post you can share"}</p>
          {editing ? (
            <textarea className="input min-h-36" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} aria-label="Edit the message" />
          ) : (
            <p className="rounded-xl bg-paper p-4 whitespace-pre-wrap">{text}</p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={pending} onClick={() => start(() => approveRecommendation(rec.id, text))}>
          {pending ? "Saving…" : "Approve"}
        </button>
        {hasDraft && (
          <button className="btn-secondary" disabled={pending} onClick={() => setEditing(!editing)}>
            {editing ? "Done editing" : "Edit"}
          </button>
        )}
        <button className="btn-quiet" disabled={pending} onClick={() => start(() => dismissRecommendation(rec.id))}>
          Not now
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        {rec.origin === "llm" ? "Written by the AI advisor from your numbers." : "Suggested by built-in rules from your numbers."} Nothing is sent until you
        do it yourself.
      </p>
    </section>
  );
}
