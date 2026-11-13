import { z } from "zod";

// Allowed values for the String "enum" columns in prisma/schema.prisma.

export const Category = z.enum(["tailoring", "tutoring", "it_services", "retail", "other"]);
export const RecordKeeping = z.enum(["none", "paper", "digital"]);
export const GrowthGoal = z.enum(["profit", "customers", "cash_collected"]);
export const Module = z.enum(["sales", "payments", "reach", "stock", "loans"]);
export const Source = z.enum(["referral", "walk_in", "social", "other", "unknown"]);
export const PaymentMethod = z.enum(["cash", "card", "eft", "other"]);
export const ExpenseCategory = z.enum(["materials", "transport", "rent", "utilities", "advertising", "other"]);
export const Area = z.enum(["profit", "payments", "reach", "stock", "loans"]);
export const ActionType = z.enum([
  "payment_reminder",
  "promo_post",
  "stock_promotion",
  "expense_review",
  "loan_reminder",
  "record_more",
]);
export const ActionStatus = z.enum(["proposed", "approved", "done", "dismissed", "cancelled"]);

export type Category = z.infer<typeof Category>;
export type RecordKeeping = z.infer<typeof RecordKeeping>;
export type GrowthGoal = z.infer<typeof GrowthGoal>;
export type Module = z.infer<typeof Module>;
export type Source = z.infer<typeof Source>;
export type PaymentMethod = z.infer<typeof PaymentMethod>;
export type ExpenseCategory = z.infer<typeof ExpenseCategory>;
export type Area = z.infer<typeof Area>;
export type ActionType = z.infer<typeof ActionType>;
export type ActionStatus = z.infer<typeof ActionStatus>;

// Plain-language labels for the UI.
export const SOURCE_LABELS: Record<Source, string> = {
  referral: "Word of mouth",
  walk_in: "Walked in",
  social: "Social media",
  other: "Other",
  unknown: "Not sure",
};
export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  materials: "Materials",
  transport: "Transport",
  rent: "Rent",
  utilities: "Electricity & water",
  advertising: "Advertising",
  other: "Other",
};
export const CATEGORY_LABELS: Record<Category, string> = {
  tailoring: "Tailoring / sewing",
  tutoring: "Tutoring / lessons",
  it_services: "Computer & phone help",
  retail: "Selling goods (shop / stall)",
  other: "Something else",
};
export const GOAL_LABELS: Record<GrowthGoal, string> = {
  profit: "Keep more money (profit)",
  customers: "Get more customers",
  cash_collected: "Get paid on time",
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  eft: "Bank transfer",
  other: "Other",
};

export function parseModules(json: string): Module[] {
  try {
    return z.array(Module).parse(JSON.parse(json));
  } catch {
    return ["sales", "payments", "reach"];
  }
}
