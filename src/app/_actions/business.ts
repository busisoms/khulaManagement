"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { PASSCODE_COOKIE, requireWriteAccess } from "@/lib/auth";
import { BUSINESS_COOKIE } from "@/lib/business";
import { seedDemo } from "@/lib/demo-seed";
import { addDays } from "@/lib/metrics";
import { paymentReminderText } from "@/lib/advisor/templates";
import { Category, GrowthGoal, RecordKeeping, type Module } from "@/types";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 60 };

export async function switchBusiness(businessId: string) {
  const exists = await db.business.findUnique({ where: { id: businessId } });
  if (exists) (await cookies()).set(BUSINESS_COOKIE, businessId, COOKIE_OPTS);
  revalidatePath("/", "layout");
  redirect("/home");
}

/** Wipes every business and reseeds the demo. Protected by the passcode. */
export async function resetDemo() {
  await requireWriteAccess("/home");
  const id = await seedDemo(db);
  (await cookies()).set(BUSINESS_COOKIE, id, COOKIE_OPTS);
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function unlock(_: { error?: string } | undefined, form: FormData) {
  const code = String(form.get("passcode") ?? "");
  const next = String(form.get("next") ?? "/home");
  if (!process.env.DEMO_PASSCODE || code !== process.env.DEMO_PASSCODE) return { error: "That passcode is not right." };
  (await cookies()).set(PASSCODE_COOKIE, code, COOKIE_OPTS);
  redirect(next.startsWith("/") ? next : "/home");
}

// ---------- onboarding ----------

/** How long ago a debt started -> days. */
const SINCE_DAYS = { week: 3, two_weeks: 14, month: 30, longer: 60 } as const;

const OnboardingInput = z.object({
  name: z.string().trim().min(1).max(80),
  category: Category,
  area: z.string().trim().min(1).max(80),
  recordKeeping: RecordKeeping,
  growthGoal: GrowthGoal,
  hasStock: z.boolean(),
  hasLoan: z.boolean(),
  budgetCents: z.number().int().min(0),
  debts: z
    .array(z.object({ name: z.string().trim().min(1).max(60), amountCents: z.number().int().positive(), since: z.enum(["week", "two_weeks", "month", "longer"]) }))
    .max(3),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export type OnboardingResult =
  | { ok: true; totalOwedCents: number; reminder: { customer: string; amountCents: number; text: string } | null }
  | { ok: false; error: string };

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  await requireWriteAccess("/onboarding");
  const parsed = OnboardingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some answers are missing. Please go back and check." };
  const f = parsed.data;

  const modules: Module[] = ["sales", "payments", "reach"];
  if (f.hasStock) modules.push("stock");
  if (f.hasLoan) modules.push("loans");

  const business = await db.business.create({
    data: {
      name: f.name,
      category: f.category,
      area: f.area,
      recordKeeping: f.recordKeeping,
      growthGoal: f.growthGoal,
      monthlyBudgetCents: f.budgetCents,
      modules: JSON.stringify(modules),
    },
  });

  // Each debt becomes an unpaid sale, dated when it started.
  for (const d of f.debts) {
    const customer = await db.customer.create({ data: { businessId: business.id, name: d.name } });
    await db.sale.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        date: addDays(new Date(), -SINCE_DAYS[d.since]),
        description: "Work done (owed from before)",
        amountCents: d.amountCents,
        source: "unknown",
      },
    });
  }

  (await cookies()).set(BUSINESS_COOKIE, business.id, COOKIE_OPTS);
  revalidatePath("/", "layout");

  const total = f.debts.reduce((t, d) => t + d.amountCents, 0);
  // Remind the person who owes the most, oldest first on ties.
  const order = ["longer", "month", "two_weeks", "week"];
  const top = [...f.debts].sort((a, b) => b.amountCents - a.amountCents || order.indexOf(a.since) - order.indexOf(b.since))[0];
  return {
    ok: true,
    totalOwedCents: total,
    reminder: top
      ? { customer: top.name, amountCents: top.amountCents, text: paymentReminderText({ businessName: f.name, customer: top.name, owedRands: top.amountCents / 100 }) }
      : null,
  };
}
