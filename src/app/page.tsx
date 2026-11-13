import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center gap-10 px-4 py-10 md:flex-row md:items-center">
      <div className="flex flex-1 flex-col gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon.svg" alt="" className="h-12 w-12 rounded-xl" />
        <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight md:text-5xl">
          Know your numbers. Get one clear next step. <span className="text-brand">Watch your business grow.</span>
        </h1>
        <p className="max-w-md text-lg text-muted">Record sales and payments in seconds. Growth Advisor works out the rest and tells you what to do next.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding" className="btn-primary px-6 text-base">
            Start
          </Link>
          <Link href="/home" className="btn-secondary px-6 text-base">
            See the demo business
          </Link>
        </div>
      </div>

      <div className="card-navy w-full max-w-sm self-center" aria-hidden>
        <p className="text-sm text-white/70">Example · profit, last 4 weeks</p>
        <p className="num mt-1 text-4xl font-semibold">R5 495</p>
        <p className="mt-2">
          <span className="pill-up">▲ 87%</span>
        </p>
        <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
          <p className="text-xs font-semibold tracking-wider text-mint uppercase">Next step</p>
          <p className="mt-1 font-semibold">Remind Lindiwe to pay R900</p>
          <p className="mt-1 text-sm text-white/70">41 days overdue. A friendly reminder is free.</p>
        </div>
      </div>
    </main>
  );
}
