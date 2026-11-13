"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWriteAccess } from "@/lib/auth";
import { getCurrentBusinessId } from "@/lib/business";
import { parseRandsToCents } from "@/lib/format";
import { ExpenseCategory, PaymentMethod, Source } from "@/types";

export type FormState = { error?: string } | undefined;

const money = z.string().transform((s, ctx) => {
  const cents = parseRandsToCents(s);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an amount, like 150 or 150.50" });
    return z.NEVER;
  }
  return cents;
});
const optionalText = z.string().trim().max(200).optional().default("");
const dateInput = z
  .string()
  .optional()
  .transform((s) => {
    if (!s) return new Date();
    const d = new Date(`${s}T12:00:00`);
    // Today's date input means "now", so the record isn't dated later today.
    return d.toDateString() === new Date().toDateString() ? new Date() : d;
  });

async function businessOrRedirect() {
  const id = await getCurrentBusinessId();
  if (!id) redirect("/onboarding");
  return id;
}

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Please check the form";
}

/** New records make the current suggestion stale; remove unanswered ones so a fresh one is made. */
async function afterRecord(businessId: string, saved: string): Promise<never> {
  await db.recommendation.deleteMany({ where: { businessId, status: "proposed" } });
  revalidatePath("/", "layout");
  redirect(`/record?saved=${saved}`);
}

async function findOrCreateCustomer(businessId: string, name: string) {
  if (!name) return null;
  const existing = await db.customer.findFirst({ where: { businessId, name } });
  return (existing ?? (await db.customer.create({ data: { businessId, name } }))).id;
}

const SaleForm = z.object({
  amount: money,
  description: z.string().trim().min(1, "What did you sell?").max(100),
  customer: optionalText,
  source: Source,
  paid: z.enum(["full", "none"]),
  date: dateInput,
});

export async function recordSale(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/sale");
  const businessId = await businessOrRedirect();
  const parsed = SaleForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  const customerId = await findOrCreateCustomer(businessId, f.customer);
  await db.sale.create({
    data: {
      businessId,
      date: f.date,
      description: f.description,
      amountCents: f.amount,
      customerId,
      source: f.source,
      payments: f.paid === "full" ? { create: { businessId, date: f.date, amountCents: f.amount, method: "cash" } } : undefined,
    },
  });
  return afterRecord(businessId, "sale");
}

const PaymentForm = z.object({
  saleId: z.string().min(1, "Choose who paid"),
  amount: money,
  method: PaymentMethod,
  date: dateInput,
});

export async function recordPayment(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/payment");
  const businessId = await businessOrRedirect();
  const parsed = PaymentForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  const sale = await db.sale.findFirst({ where: { id: f.saleId, businessId } });
  if (!sale) return { error: "That sale was not found" };
  await db.payment.create({ data: { businessId, saleId: sale.id, date: f.date, amountCents: f.amount, method: f.method } });
  return afterRecord(businessId, "payment");
}

const ExpenseForm = z.object({ amount: money, category: ExpenseCategory, note: optionalText, date: dateInput });

export async function recordExpense(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/expense");
  const businessId = await businessOrRedirect();
  const parsed = ExpenseForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  await db.expense.create({ data: { businessId, date: f.date, category: f.category, amountCents: f.amount, note: f.note } });
  return afterRecord(businessId, "expense");
}

const EnquiryForm = z.object({ source: Source, converted: z.enum(["yes", "no"]), note: optionalText, date: dateInput });

export async function recordEnquiry(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/enquiry");
  const businessId = await businessOrRedirect();
  const parsed = EnquiryForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  await db.enquiry.create({ data: { businessId, date: f.date, source: f.source, converted: f.converted === "yes", note: f.note } });
  return afterRecord(businessId, "enquiry");
}

const StockForm = z.object({
  name: z.string().trim().min(1, "What is the item called?").max(80),
  unit: z.string().trim().min(1).max(20).default("item"),
  quantity: z.coerce.number().int("Use a whole number").min(0, "Quantity can't be negative"),
  unitCost: money,
});

/** Add an item, or update how many you have. Changing the quantity counts as the stock "moving". */
export async function recordStock(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/stock");
  const businessId = await businessOrRedirect();
  const parsed = StockForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  const existing = await db.stockItem.findFirst({ where: { businessId, name: f.name } });
  if (existing) {
    await db.stockItem.update({
      where: { id: existing.id },
      data: {
        unit: f.unit,
        quantity: f.quantity,
        unitCostCents: f.unitCost,
        ...(existing.quantity !== f.quantity ? { lastMovedAt: new Date() } : {}),
      },
    });
  } else {
    await db.stockItem.create({
      data: { businessId, name: f.name, unit: f.unit, quantity: f.quantity, unitCostCents: f.unitCost, lastMovedAt: new Date() },
    });
  }
  return afterRecord(businessId, "stock");
}

const LoanForm = z.object({
  lender: z.string().trim().min(1, "Who lent you the money?").max(80),
  balance: money,
  instalment: money,
  nextDueDate: z.string().min(1, "When is the next payment due?").transform((s) => new Date(`${s}T12:00:00`)),
});

export async function recordLoan(_: FormState, form: FormData): Promise<FormState> {
  await requireWriteAccess("/record/loan");
  const businessId = await businessOrRedirect();
  const parsed = LoanForm.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const f = parsed.data;
  await db.loan.create({
    data: { businessId, lender: f.lender, principalCents: f.balance, balanceCents: f.balance, instalmentCents: f.instalment, nextDueDate: f.nextDueDate },
  });
  return afterRecord(businessId, "loan");
}
