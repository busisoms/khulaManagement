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
    <section className="card p-0" aria-labelledby="rec-title">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand" aria-hidden>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M11.3 1.05a1 1 0 0 1 .7 1.2L10.9 7H16a1 1 0 0 1 .8 1.6l-7 10a1 1 0 0 1-1.8-.85L9.1 13H4a1 1 0 0 1-.8-1.6l7-10a1 1 0 0 1 1.1-.35z" />
            </svg>
          </span>
          <p className="eyebrow">Your next step</p>
        </div>
        <h2 id="rec-title" className="mt-3 text-xl font-semibold tracking-tight">
          {rec.title}
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-ink/90">{rec.finding}</p>
        {rec.why && <p className="mt-2 text-sm text-muted">{rec.why}</p>}
      </div>

      {rec.chips.length > 0 && (
        <dl
          className="grid border-y border-line"
          style={{ gridTemplateColumns: `repeat(${Math.min(rec.chips.length, 3)}, minmax(0, 1fr))` }}
          aria-label="The numbers behind this"
        >
          {rec.chips.slice(0, 3).map((c, i) => (
            <div key={c.label} className={`min-w-0 px-3 py-3 sm:px-5 ${i > 0 ? "border-l border-line" : ""}`}>
              <dt className="truncate text-xs text-muted">{c.label}</dt>
              <dd className="num mt-0.5 truncate text-base font-semibold sm:text-lg">{c.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="p-5">
        {hasDraft && (
          <div className="mb-5">
            <p className="field-label">{rec.actionType.endsWith("reminder") ? "Message you can send" : "Post you can share"}</p>
            {editing ? (
              <textarea className="input min-h-36" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} aria-label="Edit the message" />
            ) : (
              <p className="rounded-2xl rounded-tl-sm bg-[#e7f6ef] p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{text}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary flex-1 sm:flex-none" disabled={pending} onClick={() => start(() => approveRecommendation(rec.id, text))}>
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
      </div>
    </section>
  );
}
