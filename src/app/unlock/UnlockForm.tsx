"use client";

import { useActionState } from "react";
import { unlock } from "@/app/_actions/business";

export function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(unlock, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="field-label">Passcode</span>
        <input name="passcode" type="password" className="input" required autoFocus />
      </label>
      {state?.error && (
        <p role="alert" className="font-medium text-accent">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
