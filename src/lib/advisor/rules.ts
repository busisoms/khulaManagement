/**
 * Rule-based advisor. Deterministic: the first rule that applies wins.
 * Used when there is no LLM key, or when the LLM's answer fails validation.
 *
 * Priority (BUSINESS RULES, change here):
 * 1. Not enough records (dataCoverage < MIN_COVERAGE_DAYS) -> record_more
 * 2. Anything overdue -> payment_reminder to the most overdue customer
 * 3. Loan due within LOAN_URGENT_DAYS and income < instalment -> loan_reminder
 * 4. Profit negative, or down more than PROFIT_DROP_PCT -> expense_review on the largest expense
 * 5. Slow stock -> stock_promotion for the highest-value slow item
 * 6. Otherwise -> promo_post using the best-performing customer source
 */
import { EXPENSE_LABELS, SOURCE_LABELS, type ExpenseCategory, type Source } from "@/types";
import type { Facts } from "./facts";
import type { Advice } from "./schema";
import { loanReminderText, paymentReminderText, promoPostText, stockPromotionText } from "./templates";

export const MIN_COVERAGE_DAYS = 7;
export const LOAN_URGENT_DAYS = 7;
export const PROFIT_DROP_PCT = 20;

const r = (rands: number) => `R${rands.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;

export function ruleBasedAdvice(facts: Facts): Advice {
  const { business } = facts;

  // 1. Not enough data yet.
  if (facts.dataCoverageDays < MIN_COVERAGE_DAYS) {
    return {
      area: "profit",
      finding: `You have records on ${facts.dataCoverageDays} days of the last 4 weeks. That's not enough for me to see a clear picture yet.`,
      evidence: [{ label: "Days with records (last 4 weeks)", value: facts.dataCoverageDays }],
      actionType: "record_more",
      actionTitle: "Record your sales for a week",
      draftText: "",
      why: "Record your sales for a week so I can help you properly.",
      estimatedCostCents: 0,
    };
  }

  // 2. Money overdue.
  const top = facts.payments?.overdue[0];
  if (facts.payments && top && facts.payments.overdueRands > 0) {
    return {
      area: "payments",
      finding: `${top.customer} owes you ${r(top.owedRands)} and it is ${top.daysOverdue} days overdue. In total ${r(facts.payments.overdueRands)} is overdue.`,
      evidence: [
        { label: `Owed by ${top.customer}`, value: top.owedRands },
        { label: "Days overdue", value: top.daysOverdue },
        { label: "Total overdue", value: facts.payments.overdueRands },
      ],
      actionType: "payment_reminder",
      actionTitle: `Remind ${top.customer} to pay`,
      draftText: paymentReminderText({ businessName: business.name, customer: top.customer, owedRands: top.owedRands, item: top.item }),
      why: "This is money you have already earned, and a friendly reminder is free.",
      estimatedCostCents: 0,
    };
  }

  // 3. Loan instalment soon and not enough income to cover it.
  const loan = facts.loans?.dueSoon.find((l) => l.daysUntilDue <= LOAN_URGENT_DAYS);
  if (loan && facts.sales && facts.sales.incomeRands < loan.instalmentRands) {
    return {
      area: "loans",
      finding: `Your ${r(loan.instalmentRands)} loan instalment is due in ${loan.daysUntilDue} days, but you received ${r(facts.sales.incomeRands)} in the last 4 weeks.`,
      evidence: [
        { label: "Instalment", value: loan.instalmentRands },
        { label: "Days until due", value: loan.daysUntilDue },
        { label: "Income (last 4 weeks)", value: facts.sales.incomeRands },
      ],
      actionType: "loan_reminder",
      actionTitle: "Plan for your loan payment",
      draftText: loanReminderText(loan),
      why: "Talking to your lender before the due date is better than missing a payment.",
      estimatedCostCents: 0,
    };
  }

  // 4. Profit negative or dropping.
  const s = facts.sales;
  if (s && s.largestExpense && (s.profitRands < 0 || (s.profitChangePct !== null && s.profitChangePct < -PROFIT_DROP_PCT))) {
    const label = EXPENSE_LABELS[s.largestExpense.category as ExpenseCategory] ?? s.largestExpense.category;
    return {
      area: "profit",
      finding:
        s.profitRands < 0
          ? `You spent more than you received in the last 4 weeks. ${label} was your biggest cost at ${r(s.largestExpense.rands)}.`
          : `Your profit went down from ${r(s.previousProfitRands)} to ${r(s.profitRands)}. ${label} was your biggest cost at ${r(s.largestExpense.rands)}.`,
      evidence: [
        { label: "Profit (last 4 weeks)", value: s.profitRands },
        { label: "Profit (4 weeks before)", value: s.previousProfitRands },
        { label: `${label} spending`, value: s.largestExpense.rands },
      ],
      actionType: "expense_review",
      actionTitle: `Check your ${label.toLowerCase()} spending`,
      draftText: "",
      why: "Your biggest cost is the quickest place to save money.",
      estimatedCostCents: 0,
    };
  }

  // 5. Slow stock.
  const slow = facts.stock?.slowItems[0];
  if (slow && facts.stock && facts.stock.slowStockValueRands > 0) {
    return {
      area: "stock",
      finding: `${slow.name} hasn't moved for ${slow.daysSinceMoved} days. That is ${r(slow.valueRands)} of your money sitting on the shelf.`,
      evidence: [
        { label: `${slow.name} value`, value: slow.valueRands },
        { label: "Days since it moved", value: slow.daysSinceMoved },
      ],
      actionType: "stock_promotion",
      actionTitle: `Promote your ${slow.name.toLowerCase()}`,
      draftText: stockPromotionText({ businessName: business.name, item: slow.name }),
      why: "Selling slow stock turns it back into cash you can use.",
      estimatedCostCents: 0,
    };
  }

  // 6. Default: reach more people through the best source.
  const best = (facts.reach?.bestSource ?? "referral") as Source;
  const bestSales = facts.reach?.salesBySource[best] ?? 0;
  return {
    area: "reach",
    finding: `Most of your sales come from ${SOURCE_LABELS[best].toLowerCase()}. A short post you can share could bring in a few more customers.`,
    evidence: [{ label: `Sales from ${SOURCE_LABELS[best].toLowerCase()} (last 4 weeks)`, value: bestSales }],
    actionType: "promo_post",
    actionTitle: "Share a post about your business",
    draftText: promoPostText({ businessName: business.name, category: business.category, area: business.area }),
    why: "More people knowing about you is the simplest way to get new customers.",
    estimatedCostCents: 0,
  };
}
