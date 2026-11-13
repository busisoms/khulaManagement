"use client";

import { useState, useTransition } from "react";
import { saveOutcome } from "@/app/_actions/advice";

export function OutcomeForm({ actionId, question, prompted }: { actionId: string; question: string; prompted: boolean }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className={`mt-4 flex flex-col gap-3 ${prompted ? "rounded-xl bg-warn-soft p-4" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        start(() => saveOutcome(actionId, note));
      }}
    >
      <label className="block">
        <span className="field-label">{question}</span>
        {!prompted && <span className="mb-2 block text-sm text-muted">Optional. I&apos;ll ask again in a week if you skip it.</span>}
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. She paid R500 on Friday" />
      </label>
      <button className="btn-secondary self-start" disabled={pending || !note.trim()}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
