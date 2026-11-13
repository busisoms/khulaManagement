// What each approved action type lets the owner do. Everything is local and real:
// copy text, open a WhatsApp share link (the owner sends it), download a file, or tick a checklist.
// Nothing here sends or publishes anything on the owner's behalf.

export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export const EXECUTOR_KIND: Record<string, "message" | "post" | "checklist" | "record"> = {
  payment_reminder: "message",
  loan_reminder: "message",
  promo_post: "post",
  stock_promotion: "post",
  expense_review: "checklist",
  record_more: "record",
};

/** Simple, practical checklist for reviewing a cost. */
export function checklistFor(title: string): string[] {
  const what = title.replace(/^Check your /i, "").replace(/ spending$/i, "") || "biggest cost";
  return [
    `Look at your ${what} receipts from the last month`,
    "Ask another supplier for a price",
    "Buy only what this month's orders need",
    "Ask if paying cash or buying together with others gets a discount",
    "Write down every purchase this week so you can compare next month",
  ];
}

export function doneLabel(type: string): string {
  if (EXECUTOR_KIND[type] === "message") return "I sent it";
  if (EXECUTOR_KIND[type] === "post") return "I posted it";
  return "I did it";
}

export const OUTCOME_QUESTION: Record<string, string> = {
  payment_reminder: "Did they pay?",
  loan_reminder: "Did you talk to your lender or pay the instalment?",
  promo_post: "Any new customers or messages?",
  stock_promotion: "Did any of the stock sell?",
  expense_review: "Did you find a way to spend less?",
  record_more: "How did recording go?",
};
