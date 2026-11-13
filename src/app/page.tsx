import Link from "next/link";

// Placeholder landing page. The real landing and onboarding arrive in Phase 3.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Growth Advisor</h1>
      <p className="text-lg">Know your numbers, get one clear next step, and watch your business grow.</p>
      <Link href="/debug" className="text-blue-700 underline">
        Debug: view seeded records
      </Link>
    </main>
  );
}
