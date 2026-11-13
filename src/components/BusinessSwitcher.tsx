"use client";

import { useTransition } from "react";
import { switchBusiness } from "@/app/_actions/business";

export function BusinessSwitcher({ businesses, currentId }: { businesses: { id: string; name: string }[]; currentId: string }) {
  const [pending, start] = useTransition();
  if (businesses.length < 2) return null;
  return (
    <label className="block">
      <span className="sr-only">Switch business</span>
      <select
        className="input py-2 text-sm"
        value={currentId}
        disabled={pending}
        onChange={(e) => start(() => switchBusiness(e.target.value))}
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
