import { UnlockForm } from "./UnlockForm";

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Enter the demo passcode</h1>
      <p className="mt-2 text-muted">This is a shared demo. Changing data needs the passcode from the team. Looking around doesn&apos;t.</p>
      <UnlockForm next={next ?? "/home"} />
    </main>
  );
}
