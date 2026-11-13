import { llmConfigured } from "@/lib/advisor/llm";
import { ResetDemoButton } from "./ResetDemoButton";

// Always visible: this app only ever holds fictional demo data.
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent-soft px-4 py-1.5 text-center text-sm text-ink">
      <span>
        <strong>Demo</strong> — fictional data
      </span>
      {!llmConfigured() && (
        <span className="rounded-full border border-accent/40 px-2 text-xs font-semibold text-accent" title="No AI key set: suggestions come from built-in rules">
          demo mode
        </span>
      )}
      <ResetDemoButton />
    </div>
  );
}
