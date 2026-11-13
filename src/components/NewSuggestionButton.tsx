"use client";

import { useTransition } from "react";
import { newRecommendation } from "@/app/_actions/advice";

export function NewSuggestionButton({ label = "Get my next step" }: { label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-primary" disabled={pending} onClick={() => start(() => newRecommendation())}>
      {pending ? "Looking at your numbers…" : label}
    </button>
  );
}
