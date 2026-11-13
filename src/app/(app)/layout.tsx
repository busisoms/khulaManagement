import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentBusinessId } from "@/lib/business";
import { NavLinks } from "@/components/NavLinks";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const currentId = await getCurrentBusinessId();
  if (!currentId) redirect("/onboarding");
  const businesses = await db.business.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const current = businesses.find((b) => b.id === currentId)!;

  return (
    <div className="md:flex">
      {/* Sidebar: tablet and desktop */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:gap-6 md:border-r md:border-line md:bg-card md:p-4">
        <Link href="/home" className="flex items-center gap-2 px-2 pt-2 text-lg font-bold text-brand-dark">
          <img src="/icons/icon.svg" alt="" className="h-8 w-8" />
          Growth Advisor
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          <NavLinks variant="sidebar" />
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          <p className="px-1 text-sm text-muted">Business</p>
          <p className="px-1 font-semibold">{current.name}</p>
          <BusinessSwitcher businesses={businesses} currentId={currentId} />
          <Link href="/onboarding" className="px-1 text-sm font-medium text-brand underline underline-offset-2">
            Set up another business
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar: mobile */}
        <header className="flex items-center justify-between gap-3 border-b border-line bg-card px-4 py-3 md:hidden">
          <p className="truncate font-bold text-brand-dark">{current.name}</p>
          <div className="w-40 shrink-0">
            <BusinessSwitcher businesses={businesses} currentId={currentId} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1100px] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      {/* Bottom navigation: mobile */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
