"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/_actions/record";

/** A form wired to a server action, showing its error message and a pending state. */
export function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-5">
      {children}
      {state?.error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 font-medium text-accent">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
