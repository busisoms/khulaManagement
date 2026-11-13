"use client";

import { useTransition } from "react";
import { resetDemo } from "@/app/_actions/business";

export function ResetDemoButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="min-h-8 text-sm font-semibold text-accent underline underline-offset-2 disabled:opacity-60"
      disabled={pending}
      onClick={() => {
        if (confirm("Reset the demo? This removes every business and restores Thandi's Tailoring.")) start(() => resetDemo());
      }}
    >
      {pending ? "Resetting…" : "Reset demo"}
    </button>
  );
}
