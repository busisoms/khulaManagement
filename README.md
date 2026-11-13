# Growth Advisor

**Know your numbers, get one clear next step, and watch your business grow.**

Growth Advisor is a responsive web app (installable as a PWA) for South African micro-business owners who keep few or no records. The owner records sales, payments, expenses, enquiries, stock and loans in a few taps. The app works out the numbers, picks **one** clear next step, drafts it for the owner to approve, and shows progress as a growing tree and a monthly report.

> **Demo: fictional data only.** The demo business, "Thandi's Tailoring", and all its customers and records are invented. The seed has no real names or phone numbers.

---

## Quick start (local)

Requires Node 20 (`.nvmrc` pins it).

```bash
nvm use                      # Node 20
npm install                  # also runs `prisma generate`
cp .env.example .env         # defaults work out of the box (no API key needed)
npx prisma migrate dev       # first time only: creates prisma/dev.db
npm run db:seed              # loads the fictional demo business
npm run dev                  # http://localhost:3000
```

Open http://localhost:3000.

Other useful commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the unit tests (Vitest): metrics, growth score, advisor, action state machine |
| `npm run db:reset` | Wipes the database, re-applies migrations and reseeds. When an AI agent runs this, Prisma asks for confirmation first. |
| `npm run build` / `npm run start` | Production build / start |
| `npm run start:prod` | Applies migrations, seeds only if the DB is empty, then starts (used on Render) |
| `npm run icons` | Regenerates the PWA icons in `public/icons/` |

In the app, the **Reset demo** button restores the seeded demo data. It replaces every business in the database, including ones you added.

---

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Required | Example / default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` (local), `file:/data/app.db` (Render/Railway) | SQLite file. Relative paths are relative to `prisma/schema.prisma`. |
| `LLM_PROVIDER` | no | `anthropic` | LLM provider. Only `anthropic` is implemented. |
| `LLM_API_KEY` | no | *(empty)* | Provider API key. **If empty, the app runs in demo mode with the rule-based advisor**, fully offline. |
| `LLM_MODEL` | no | `claude-opus-5-5` | Model id. |
| `DEMO_PASSCODE` | on public deploys | *(empty)* | Shared passcode for all writes and "Reset demo". If empty (local dev), writes are open. Visitors enter it once on `/unlock`. |

---

## How it works

The app runs one loop:

1. **Record**: the owner logs sales, payments, expenses, enquiries, stock and loans. Money is stored as integer cents.
2. **Investigate**: plain TypeScript (`src/lib/metrics/`) computes the numbers: income, profit, money owed and overdue, slow stock, loans due soon, where customers come from. It's deterministic and unit-tested.
3. **Recommend**: the advisor picks **one** finding and explains it in plain language, citing the computed numbers. With an API key, the LLM writes the explanation. Its JSON is validated with Zod, and **if it cites any number that isn't in the computed facts, the answer is rejected** and the rule-based advisor is used instead.
4. **Act**: the owner approves, edits or dismisses the suggested action. Executors are local only: copy to clipboard, open a prefilled `wa.me` WhatsApp link, download a `.txt`, or follow a checklist. The owner sends anything themselves. The UI never says "sent".
5. **Grow**: a growth tree and a monthly report compare the business with **its own baseline**, not with other businesses.

### Non-negotiable rules

- **The LLM never calculates.** All numbers come from tested TypeScript.
- **The LLM never acts.** Actions only move forward when the owner says so (`proposed → approved → done`, or `dismissed` / `cancelled`). Every change is written to an audit log.
- **Every recommendation cites evidence**, using numbers the app computed.
- **No fake external actions.** No real WhatsApp, email, social or payment integrations. The owner does the sending.
- **Plain language.** Written for owners, not accountants.
- **Works without an API key.** The rule-based advisor covers everything offline.

Other routes: `/debug` shows the raw records and computed facts. `/api/health` returns `ok` and a record count.

---

## Where the business rules live

To change a rule, edit the constant in the file listed.

| Rule | File | Value |
| --- | --- | --- |
| A sale is due this many days after the sale date | `src/lib/metrics/constants.ts` (`DUE_DAYS`) | 14 days |
| Stock unmoved for longer than this is "slow stock" | `src/lib/metrics/constants.ts` (`SLOW_STOCK_DAYS`) | 30 days |
| Loan instalments due within this window are "due soon" | `src/lib/metrics/constants.ts` (`LOAN_DUE_WINDOW_DAYS`) | 14 days |
| Reporting period | `src/lib/metrics/constants.ts` (`PERIOD_DAYS`) | last 28 days |
| Rule-based advisor priority (first match wins) | `src/lib/advisor/rules.ts` | 1. too few records → record more · 2. overdue money → payment reminder (most overdue customer) · 3. urgent loan the income can't cover → loan reminder · 4. profit negative or falling → expense review · 5. slow stock → stock promotion · 6. otherwise → promo post via best customer source |
| "Not enough records" threshold | `src/lib/advisor/rules.ts` (`MIN_COVERAGE_DAYS`) | < 7 days with records in last 4 weeks |
| Loan is urgent if due within | `src/lib/advisor/rules.ts` (`LOAN_URGENT_DAYS`) | 7 days, and 4-week income < instalment |
| Profit drop that triggers an expense review | `src/lib/advisor/rules.ts` (`PROFIT_DROP_PCT`) | more than 20% down, or negative |
| Baseline period | `src/lib/growth/score.ts` (`BASELINE_MIN_COVERAGE_DAYS`) | first 4-week window with ≥ 10 days of records |
| Growth stages (% change of the goal metric vs baseline) | `src/lib/growth/score.ts` (`STAGE_THRESHOLDS`) | Seed (no baseline) · Sprout < 0% · Sapling 0–10% · Young tree 10–25% · Thriving > 25% |
| Ask "what happened?" after a done action | `src/lib/actions/state.ts` (`OUTCOME_PROMPT_DAYS`) | 7 days |
| Allowed action transitions | `src/lib/actions/state.ts` (`TRANSITIONS`) | proposed → approved/dismissed; approved → done/cancelled |

The goal metric is the owner's choice at onboarding: profit, number of customers or cash collected. Completed actions and days with records are shown as "watering", but they never change the stage.

---

## Project structure

```
prisma/
  schema.prisma          Data model (Business, Sale, Payment, Expense, StockItem, Loan, Enquiry,
                         Recommendation, Action, AuditEvent)
  seed.ts                Seeds the demo (npm run db:seed)
  seed-if-empty.ts       Seeds only when the DB is empty (used on deploy)
src/
  app/
    (app)/               Main screens: home, record, actions, report
    _actions/            Server Actions for all writes (passcode-gated)
    onboarding/          New-business wizard
    unlock/              Enter the demo passcode
    debug/               Raw records + computed facts
    api/health/          Health check
    manifest.ts          PWA manifest
  components/            UI: growth tree, recommendation card, action executor, business switcher, ...
  lib/
    metrics/             Deterministic metrics + business-rule constants (tested)
    advisor/             Facts builder, prompt, LLM adapter, Zod schema, validation, rules fallback
    actions/             Action state machine (tested) and local executors
    growth/              Growth score and stages (tested)
    auth.ts              DEMO_PASSCODE cookie gate
    demo-seed.ts         Fictional "Thandi's Tailoring" story (8 weeks)
    report.ts            Monthly report
public/                  Icons and service worker (sw.js)
render.yaml              Render deploy blueprint
```

Stack: Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Prisma 6 + SQLite, Zod, Vitest. The LLM adapter (`src/lib/advisor/llm.ts`) is provider-agnostic and calls the Anthropic Messages API with plain `fetch`, so there's no SDK dependency.

---

## Demo script (3 minutes)

1. **The problem.** Many micro-business owners don't know if they're making money, who owes them, or what to do next, and records feel like extra work.
2. **Onboard a new business live.** Run the onboarding wizard, add a customer who owes money, and get a payment-reminder draft right away.
3. **Switch to Thandi's Tailoring ("8 weeks later")** with the business switcher.
4. **Home.** Show the growth tree, the key numbers, and a recommendation that cites its evidence: a customer owes **R900** and the payment is **41 days** overdue.
5. **Act.** Approve the reminder → **Open in WhatsApp** (the owner sends it) → **I sent it** → add an outcome note.
6. **Report.** Show what changed against the baseline, the actions taken, what seemed to help, and the next step.
7. **Vision** (spoken only): where this could go next.

The seed data is relative to the day it runs, so the story (R900, 41 days overdue, loan due in 5 days, slow fabric bolts) holds whenever you reseed.

---

## Deploy (Render)

The repo includes a `render.yaml` blueprint. In Render, choose **New → Blueprint** and point it at this repo. The blueprint sets up:

- One **Node web service** with a **1 GB persistent disk** mounted at `/data`
- `DATABASE_URL=file:/data/app.db`
- Build: `npm ci && npm run build`
- Start: `npm run start:prod`, which runs `prisma migrate deploy`, seeds **only if the DB is empty** (`prisma/seed-if-empty.ts`, so data survives redeploys), then `next start`
- Health check: `/api/health`

Set **`LLM_API_KEY`** and **`DEMO_PASSCODE`** in the Render dashboard, never in the repo. Persistent disks need a **paid Render plan** (the blueprint uses `starter`).

**Railway** also works: use the same build and start commands, set the same env vars, and add a volume mounted at `/data`.

**Don't use Vercel with SQLite.** It has no persistent disk, so you'd first need to switch Prisma to a hosted Postgres database.

### Post-deploy checklist

- [ ] Loads on a phone and a laptop
- [ ] "Add to Home screen" installs the app
- [ ] Data survives a redeploy
- [ ] **Reset demo** restores the seed
- [ ] Writes without the passcode are refused (redirect to `/unlock`)

---

## Out of scope

- User accounts and logins (only a shared demo passcode)
- Native mobile apps
- Offline sync
- Real social, WhatsApp, email or payment integrations
- OCR, voice input or CSV import
- Multi-agent setups
