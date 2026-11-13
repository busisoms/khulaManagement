// Templated draft messages. Used by the rule-based advisor and onboarding.
// Keep them short, polite and ready to send as-is.

const r = (rands: number) => `R${rands.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;

export function paymentReminderText(opts: { businessName: string; customer: string; owedRands: number; item?: string }) {
  const first = opts.customer.split(" ")[0];
  const forWhat = opts.item ? ` for the ${opts.item.toLowerCase()}` : "";
  return (
    `Hi ${first}, this is ${opts.businessName}. I hope you are well. ` +
    `Just a friendly reminder that ${r(opts.owedRands)}${forWhat} is still outstanding. ` +
    `Please let me know when you can pay — cash or bank transfer is fine. Thank you!`
  );
}

export function loanReminderText(opts: { lender: string; instalmentRands: number; daysUntilDue: number }) {
  return (
    `Reminder for myself: the ${r(opts.instalmentRands)} instalment to ${opts.lender} is due in ${opts.daysUntilDue} days. ` +
    `If money is tight this month, I will call the lender before the due date to talk about it.`
  );
}

export function promoPostText(opts: { businessName: string; category: string; area: string }) {
  const what: Record<string, string> = {
    tailoring: "alterations, repairs and made-to-measure clothes",
    tutoring: "lessons and homework help",
    it_services: "phone and computer help",
    retail: "everyday goods at fair prices",
  };
  return (
    `${opts.businessName} is open! We do ${what[opts.category] ?? "good work at fair prices"} in ${opts.area}. ` +
    `Message me for a quote or come and see me this week. Please share with a friend who needs it!`
  );
}

export function stockPromotionText(opts: { businessName: string; item: string }) {
  return (
    `Special this week at ${opts.businessName}: ${opts.item} at a reduced price while stock lasts. ` +
    `Message me or pop in to have a look. Please share!`
  );
}
