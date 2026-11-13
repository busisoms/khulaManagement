// Business rules for the metrics. Change them here.

/** A sale is due this many days after the sale date. */
export const DUE_DAYS = 14;

/** Stock that hasn't moved for longer than this is "slow stock". */
export const SLOW_STOCK_DAYS = 30;

/** Loans with an instalment due within this many days are shown as "due soon". */
export const LOAN_DUE_WINDOW_DAYS = 14;

/** The standard reporting period: the last 4 weeks. */
export const PERIOD_DAYS = 28;
