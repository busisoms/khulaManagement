"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/record", label: "Record", icon: "M12 5v14M5 12h14" },
  { href: "/actions", label: "Actions", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/report", label: "Report", icon: "M5 20V10M12 20V4M19 20v-7" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function NavLinks({ variant }: { variant: "sidebar" | "bottom" }) {
  const path = usePathname();
  return (
    <>
      {ITEMS.map((item) => {
        const active = path === item.href || path.startsWith(item.href + "/");
        if (variant === "bottom") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-medium ${active ? "text-brand" : "text-muted"}`}
            >
              <Icon d={item.icon} />
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-base font-medium ${active ? "bg-brand-soft text-brand-dark" : "text-ink hover:bg-paper"}`}
          >
            <Icon d={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
