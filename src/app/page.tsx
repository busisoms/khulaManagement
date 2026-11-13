import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <img src="/icons/icon.svg" alt="" className="h-16 w-16" />
      <h1 className="text-4xl leading-tight font-bold text-brand-dark">Know your numbers, get one clear next step, and watch your business grow.</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/onboarding" className="btn-primary text-lg">
          Start
        </Link>
        <Link href="/home" className="btn-secondary text-lg">
          See the demo business
        </Link>
      </div>
    </main>
  );
}
