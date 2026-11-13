"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelAction, markActionDone } from "@/app/_actions/advice";
import { whatsappLink } from "@/lib/actions/executors";

type Props = {
  actionId: string;
  kind: "message" | "post" | "checklist" | "record";
  initialText: string;
  checklist: string[];
  doneLabel: string;
  businessName: string;
  recordLinks: { href: string; label: string }[];
};

/** The owner carries out an approved action. Nothing here sends or posts anything. */
export function ActionExecutor({ actionId, kind, initialText, checklist, doneLabel, businessName, recordLinks }: Props) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [pending, start] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older phones: fall back to selecting the text.
      const ta = document.getElementById("action-text") as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-post.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="card flex flex-col gap-4">
      {(kind === "message" || kind === "post") && (
        <>
          <label className="block">
            <span className="field-label">{kind === "message" ? "Your message" : "Your post"} (you can change it)</span>
            <textarea id="action-text" className="input min-h-40" value={text} maxLength={600} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={copy}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
            {kind === "message" ? (
              <a className="btn-secondary" href={whatsappLink(text)} target="_blank" rel="noopener noreferrer">
                Open in WhatsApp
              </a>
            ) : (
              <button type="button" className="btn-secondary" onClick={download}>
                Download .txt
              </button>
            )}
          </div>
          <p className="text-sm text-muted">
            {kind === "message"
              ? "WhatsApp opens with your message ready. You choose who to send it to and press send yourself."
              : "Copy it into Facebook, WhatsApp status or a poster. You post it yourself."}
          </p>
        </>
      )}

      {kind === "checklist" && (
        <fieldset>
          <legend className="field-label">Tick what you&apos;ve done</legend>
          <ul className="flex flex-col gap-2">
            {checklist.map((item) => (
              <li key={item}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6 accent-brand"
                    checked={ticked.includes(item)}
                    onChange={(e) => setTicked(e.target.checked ? [...ticked, item] : ticked.filter((t) => t !== item))}
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      {kind === "record" && (
        <div>
          <p className="mb-3">Record what happens each day this week. A few seconds each time is enough.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {recordLinks.map((l) => (
              <Link key={l.href} href={l.href} className="btn-secondary">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-line pt-4">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => start(() => markActionDone(actionId, kind === "message" || kind === "post" ? text : undefined, kind === "checklist" ? { ticked } : {}))}
        >
          {pending ? "Saving…" : doneLabel}
        </button>
        <button type="button" className="btn-quiet" disabled={pending} onClick={() => start(() => cancelAction(actionId))}>
          Cancel this action
        </button>
      </div>
    </section>
  );
}
