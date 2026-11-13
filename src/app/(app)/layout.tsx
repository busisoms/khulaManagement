import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { NavLinks } from "@/components/NavLinks";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";

export const dynamic = "force-dynamic";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/icon.svg" alt="" className="h-8 w-8 rounded-lg" />
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentId = await getCurrentBusinessId();
  if (!currentId) redirect("/onboarding");
  const businesses = await db.business.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const current = businesses.find((b) => b.id === currentId)!;
  const initials = current.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="md:flex md:min-h-screen">
      {/* Sidebar: tablet and desktop */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-line md:bg-card">
        <div className="sticky top-0 flex h-screen flex-col gap-8 p-4">
          <Link href="/home" className="flex items-center gap-2.5 px-2 pt-2 text-[17px] font-semibold tracking-tight">
            <Logo />
            Growth Advisor
          </Link>
          <nav className="flex flex-col gap-1" aria-label="Main">
            <NavLinks variant="sidebar" />
          </nav>
          <div className="mt-auto flex flex-col gap-3 rounded-2xl bg-paper p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-semibold text-white">{initials}</span>
              <span className="min-w-0">
                <span className="block text-xs text-muted">Business</span>
                <span className="block truncate font-semibold">{current.name}</span>
              </span>
            </div>
            <BusinessSwitcher businesses={businesses} currentId={currentId} />
            <Link href="/onboarding" className="text-sm font-semibold text-brand hover:underline">
              + Set up another business
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar: mobile */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="truncate font-semibold">{current.name}</span>
          </span>
          <div className="w-36 shrink-0">
            <BusinessSwitcher businesses={businesses} currentId={currentId} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      {/* Bottom navigation: mobile */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
