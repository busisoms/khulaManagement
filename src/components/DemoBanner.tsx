import { llmConfigured } from "@/lib/advisor/llm";
import { ResetDemoButton } from "./ResetDemoButton";

// Always visible: this app only ever holds fictional demo data.
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-1.5 text-center text-xs text-white/80">
      <span>
        <strong>Demo</strong> — fictional data
      </span>
      {!llmConfigured() && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white" title="No AI key set: suggestions come from built-in rules">
          demo mode
        </span>
      )}
      <ResetDemoButton />
    </div>
  );
}
