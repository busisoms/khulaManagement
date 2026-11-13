/**
 * Seed: "Thandi's Tailoring" with 8 weeks of FICTIONAL records.
 *
 * All dates are relative to the day the seed runs, so the demo story stays true
 * whenever it is reseeded (e.g. the largest debt is always 41 days overdue).
 *
 * Timeline (days ago):  week 1 = 55..49, week 2 = 48..42, ... week 8 = 6..0 (today)
 *
 * Story built into the data:
 * - Weeks 1–4 (baseline): steady sales, mostly from referrals.
 * - 3 overdue customers; the largest owes R900 and is 41 days overdue.
 * - A materials-cost spike in week 6, and a one-off machine repair in week 7.
 * - 2 fabric bolts that haven't moved for 45+ days.
 * - A small equipment loan with an instalment due in 5 days.
 * - A promo post done in week 5, followed by social enquiries (2 converted).
 *
 * Names are invented. No phone numbers.
 */
import type { PrismaClient } from "@prisma/client";

// ---------- data ----------

const REGULARS = [
  "Lindiwe M.",
  "Sipho N.",
  "Ayanda K.",
  "Precious T.",
  "Nomvula S.",
  "Zanele R.",
  "Mpho L.",
  "Thabo G.",
  "Grace P.",
  "Lerato B.",
  "Kagiso F.",
  "Naledi W.",
];
const NEW_SOCIAL_CUSTOMERS = ["Ruth V.", "Dineo H."];

const ALTERATIONS = [
  "Hem trousers",
  "Take in dress",
  "Replace zip",
  "Shorten sleeves",
  "Let out waist",
  "School uniform repairs",
  "Taper suit trousers",
];
const DRESSES = ["Made-to-measure dress", "Church dress", "Matric dance dress", "Traditional outfit"];

/** Deletes ALL businesses and recreates the demo business. Returns its id. */
export async function seedDemo(prisma: PrismaClient): Promise<string> {
  // ---------- helpers ----------

  const R = (rands: number) => Math.round(rands * 100); // rands -> cents

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  /** A date `n` days before today at the given hour. Never later than "now" for past/today dates. */
  function daysAgo(n: number, hour = 10): Date {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - n);
    d.setHours(hour, 0, 0, 0);
    const now = new Date();
    return n >= 0 && d > now ? now : d;
  }

  function daysFromNow(n: number): Date {
    return daysAgo(-n);
  }

  /** First "days ago" value of a week (1-based). Week 1 starts 55 days ago. */
  function weekStart(week: number): number {
    return 55 - 7 * (week - 1);
  }

  // Deterministic pseudo-random numbers so every reseed gives the same data.
  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20240607);
  const between = (min: number, max: number, step: number) =>
    min + Math.floor(rand() * ((max - min) / step + 1)) * step;
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];

  await prisma.business.deleteMany(); // cascades to every related record

  const business = await prisma.business.create({
    data: {
      name: "Thandi's Tailoring",
      category: "tailoring",
      area: "Small town, Eastern Cape",
      recordKeeping: "paper",
      growthGoal: "profit",
      monthlyBudgetCents: R(200),
      modules: JSON.stringify(["sales", "payments", "reach", "stock", "loans"]),
    },
  });
  const businessId = business.id;

  const customerIds = new Map<string, string>();
  for (const name of [...REGULARS, ...NEW_SOCIAL_CUSTOMERS]) {
    const c = await prisma.customer.create({ data: { businessId, name } });
    customerIds.set(name, c.id);
  }

  /** Create a sale and its payments. Payments dated in the future are skipped (still owed). */
  async function sale(opts: {
    daysAgo: number;
    description: string;
    rands: number;
    customer?: string;
    source: string;
    /** Leave `rands` out to pay the full sale amount. */
    payments: { daysAgo: number; rands?: number; method?: string }[];
  }) {
    const s = await prisma.sale.create({
      data: {
        businessId,
        date: daysAgo(opts.daysAgo),
        description: opts.description,
        amountCents: R(opts.rands),
        customerId: opts.customer ? customerIds.get(opts.customer) : null,
        source: opts.source,
      },
    });
    for (const p of opts.payments) {
      if (p.daysAgo < 0) continue;
      await prisma.payment.create({
        data: {
          businessId,
          saleId: s.id,
          date: daysAgo(p.daysAgo, 15),
          amountCents: p.rands === undefined ? R(opts.rands) : R(p.rands),
          method: p.method ?? "cash",
        },
      });
    }
  }

  // ---------- regular sales, weeks 1–8 ----------
  for (let week = 1; week <= 8; week++) {
    const first = weekStart(week);
    // 4 working days a week (Mon–Sat style spread), deterministic.
    const dayOffsets = [0, 1, 2, 3, 4, 5].sort(() => rand() - 0.5).slice(0, 4).sort();
    for (const offset of dayOffsets) {
      const day = first - offset;
      const isReferral = rand() < 0.75;
      await sale({
        daysAgo: day,
        description: pick(ALTERATIONS),
        rands: between(80, 250, 10),
        customer: isReferral ? pick(REGULARS) : undefined,
        source: isReferral ? "referral" : "walk_in",
        payments: [{ daysAgo: day, method: rand() < 0.7 ? "cash" : "eft" }], // paid in full on the day
      });
    }
    // One dress a week: 50% deposit, balance paid on collection 5 days later.
    const dressDay = first - dayOffsets[1];
    const dressRands = between(600, 1800, 50);
    await sale({
      daysAgo: dressDay,
      description: pick(DRESSES),
      rands: dressRands,
      customer: pick(REGULARS),
      source: "referral",
      payments: [
        { daysAgo: dressDay, rands: dressRands / 2 },
        { daysAgo: dressDay - 5, rands: dressRands / 2, method: "eft" },
      ],
    });
  }

  // ---------- overdue customers (the demo's key finding) ----------
  // Due date = sale date + 14 days. Largest: R900, sold 55 days ago -> 41 days overdue.
  await sale({ daysAgo: 55, description: "Wedding guest dress", rands: 900, customer: "Lindiwe M.", source: "referral", payments: [] });
  // R650 dress, R300 paid -> R350 owed, sold 38 days ago -> 24 days overdue.
  await sale({
    daysAgo: 38,
    description: "Church dress",
    rands: 650,
    customer: "Sipho N.",
    source: "referral",
    payments: [{ daysAgo: 38, rands: 300 }],
  });
  // R220 alteration, unpaid, sold 24 days ago -> 10 days overdue.
  await sale({ daysAgo: 24, description: "Suit alterations", rands: 220, customer: "Thabo G.", source: "walk_in", payments: [] });
  // Owed but NOT overdue yet: R1,200 dress, R600 deposit, sold 4 days ago.
  await sale({
    daysAgo: 4,
    description: "Matric dance dress",
    rands: 1200,
    customer: "Grace P.",
    source: "referral",
    payments: [{ daysAgo: 4, rands: 600 }],
  });

  // ---------- social sales after the week-5 promo post ----------
  await sale({
    daysAgo: 22,
    description: "Traditional outfit",
    rands: 1400,
    customer: "Ruth V.",
    source: "social",
    payments: [
      { daysAgo: 22, rands: 700 },
      { daysAgo: 15, rands: 700, method: "eft" },
    ],
  });
  await sale({
    daysAgo: 12,
    description: "Take in dress",
    rands: 180,
    customer: "Dineo H.",
    source: "social",
    payments: [{ daysAgo: 12, rands: 180 }],
  });

  // ---------- expenses ----------
  for (const day of [55, 27]) {
    // Every 4 weeks
    await prisma.expense.create({ data: { businessId, date: daysAgo(day, 9), category: "rent", amountCents: R(1500), note: "Room rent" } });
    await prisma.expense.create({ data: { businessId, date: daysAgo(day, 9), category: "utilities", amountCents: R(300), note: "Electricity" } });
  }
  for (let week = 1; week <= 8; week++) {
    const first = weekStart(week);
    await prisma.expense.create({ data: { businessId, date: daysAgo(first - 1, 8), category: "transport", amountCents: R(60), note: "Taxi to town" } });
    // Materials-cost spike in week 6.
    const materials = week === 6 ? 3500 : between(250, 400, 10);
    const note = week === 6 ? "Lining and fabric — supplier prices up" : "Thread, zips, lining";
    await prisma.expense.create({ data: { businessId, date: daysAgo(first - 2, 11), category: "materials", amountCents: R(materials), note } });
  }

  // One-off repair in week 7.
  await prisma.expense.create({ data: { businessId, date: daysAgo(weekStart(7) - 3, 14), category: "other", amountCents: R(900), note: "Overlocker repair" } });

  // ---------- stock ----------
  await prisma.stockItem.createMany({
    data: [
      // Slow stock: unmoved for 45+ days.
      { businessId, name: "Shweshwe fabric (blue)", unit: "bolt", quantity: 3, unitCostCents: R(450), lastMovedAt: daysAgo(47) },
      { businessId, name: "Ivory satin", unit: "bolt", quantity: 2, unitCostCents: R(600), lastMovedAt: daysAgo(52) },
      // Moving stock.
      { businessId, name: "Thread (assorted)", unit: "spool", quantity: 40, unitCostCents: R(15), lastMovedAt: daysAgo(3) },
      // Old but empty (quantity 0) — should NOT count as slow stock.
      { businessId, name: "Zips 20cm", unit: "zip", quantity: 0, unitCostCents: R(8), lastMovedAt: daysAgo(60) },
    ],
  });

  // ---------- loan ----------
  await prisma.loan.create({
    data: {
      businessId,
      lender: "Equipment finance (sewing machine)",
      principalCents: R(8000),
      balanceCents: R(4500),
      instalmentCents: R(750),
      nextDueDate: daysFromNow(5),
    },
  });

  // ---------- enquiries ----------
  const enquiries: { daysAgo: number; source: string; converted: boolean; note: string }[] = [
    // Baseline: word of mouth.
    { daysAgo: 53, source: "referral", converted: true, note: "Friend of Lindiwe, wants a dress" },
    { daysAgo: 45, source: "referral", converted: true, note: "School uniforms" },
    { daysAgo: 40, source: "walk_in", converted: false, note: "Asked about curtains" },
    { daysAgo: 33, source: "referral", converted: true, note: "Suit alterations" },
    // After the week-5 promo post: social enquiries, 2 converted.
    { daysAgo: 26, source: "social", converted: false, note: "Asked prices on Facebook" },
    { daysAgo: 23, source: "social", converted: true, note: "Traditional outfit (Ruth V.)" },
    { daysAgo: 18, source: "social", converted: false, note: "Wedding dress quote" },
    { daysAgo: 13, source: "social", converted: true, note: "Dress alteration (Dineo H.)" },
    { daysAgo: 8, source: "social", converted: false, note: "Asked about school uniforms" },
    { daysAgo: 5, source: "referral", converted: true, note: "Matric dance dress" },
  ];
  await prisma.enquiry.createMany({
    data: enquiries.map((e) => ({ businessId, date: daysAgo(e.daysAgo, 12), source: e.source, converted: e.converted, note: e.note })),
  });

  // ---------- past promo post (week 5), already done ----------
  const promoText =
    "Thandi's Tailoring — 12 years of alterations, dresses and traditional outfits. " +
    "Bring your clothes in this week or message me for a quote. Neat work, fair prices.";
  const rec = await prisma.recommendation.create({
    data: {
      businessId,
      createdAt: daysAgo(27, 8),
      area: "reach",
      finding: "Almost all your customers come from people telling their friends. A post could reach new people.",
      evidence: JSON.stringify([{ label: "Sales from referrals (last 4 weeks)", value: "most" }]),
      actionType: "promo_post",
      draftText: promoText,
      origin: "rules",
      status: "accepted",
    },
  });
  const action = await prisma.action.create({
    data: {
      businessId,
      recommendationId: rec.id,
      createdAt: daysAgo(27, 8),
      type: "promo_post",
      payload: JSON.stringify({ text: promoText }),
      status: "done",
      approvedAt: daysAgo(27, 9),
      completedAt: daysAgo(27, 18),
      outcomeNote: "A few people messaged after the post. Two became customers.",
    },
  });
  const events: { eventType: string; at: Date; details: object }[] = [
    { eventType: "proposed", at: daysAgo(27, 8), details: {} },
    { eventType: "approved", at: daysAgo(27, 9), details: {} },
    { eventType: "done", at: daysAgo(27, 18), details: { note: "Owner posted it on Facebook themselves" } },
    { eventType: "outcome_recorded", at: daysAgo(20, 9), details: {} },
  ];
  for (const e of events) {
    await prisma.auditEvent.create({
      data: { businessId, actionId: action.id, eventType: e.eventType, timestamp: e.at, createdAt: e.at, details: JSON.stringify(e.details) },
    });
  }

  return businessId;
}
