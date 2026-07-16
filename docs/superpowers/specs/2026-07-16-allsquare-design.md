# Allsquare — Design Spec

**Date:** 2026-07-16
**Status:** Approved design, pre-implementation
**Owner:** Yuichi Okuhama (`yuichi-9621`)

> Split anything on a trip. End up **all square**.

---

## 1. Summary

Allsquare is a browser-first PWA for splitting group expenses on trips. Anyone
with a shared link can record "who paid what, in which currency, split between
whom," and instantly see the **fewest transfers** that settle everyone up — with
**no account, no install, no paywall, and no expense limit**.

It is an English-language reimagining of [walica.jp](https://walica.jp/)'s best
ideas, hardened against walica's one documented weakness (data loss) and aimed at
the gap Splitwise left open when it began paywalling travelers.

## 2. Why this exists (positioning)

The English no-signup bill-splitter niche is **not** empty (Kittysplit, Billzer,
Spllito, Bill Split Pro all exist). "Walica but English" is not, by itself, a wedge.

The real opening is that **Splitwise is actively alienating travelers**:

- Free tier now caps expenses at ~3/day — worst precisely on a trip, where you
  log a dozen a day.
- Currency conversion is behind $4.99/mo Pro.
- Trustpilot ~1.8/5, ~65% one-star (early 2026).

Meanwhile the free no-signup crowd is thin on features: most don't advertise
multi-currency, minimal-transfer settlement, or real-time sync.

**Allsquare's wedge** is the specific combination none of them offer for free:

> honest **per-expense multi-currency** + **minimal-transfer settlement** +
> **real-time**, all from a **shared link with no account**.

Positioning line: *the anti-Splitwise for travel* — everything Splitwise now
charges for is free and account-free here.

## 3. The three load-bearing ideas

These three decisions are what make the product trustworthy. Everything else is
detail.

### 3.1 The link is the credential
A group is a set of member names on a shared URL. Open the link, tap "I'm Alice,"
start adding expenses. Guests install nothing and sign up for nothing.

This is the **moat** and it is protected absolutely. The failure mode of every
group-expense app is the one friend who won't install/sign up — their expenses
never get recorded and the math is wrong for everyone. Allsquare removes that
friend from the funnel. Anyone with the link can view and edit (acceptable for a
friends-only trip context in v1).

### 3.2 Every expense freezes its own FX rate at entry time
An expense stores the **original amount**, the **original currency**, AND **the
exchange rate to the group's base currency as of the entry date**.

- Rates come from [Frankfurter](https://frankfurter.dev/) — free, no API key, no
  quota, ECB reference rates, historical coverage, self-hostable.
- Frankfurter publishes **once per working day**. Weekend/holiday expenses
  **carry forward the last published rate** — a documented, deliberate rule.
- The frozen rate is **never** recomputed from live rates. A balance settled on
  Tuesday must read identically on Thursday.
- The original amount + currency is the **truth**; the base-currency figure is a
  **derived** value, always displayed as derived (e.g. "¥5,000 · ≈ $33.10").

### 3.3 Settlement is derived, never stored
Balances and settle-up are computed live from the append-only expense log:

1. Net each member's position in the group base currency.
2. Greedily collapse to the **minimum number of transfers** that zero everyone out.
3. Five payments across the group can reduce to a single "Alice pays Bob $40" line.

Because settlement is derived, editing/deleting an expense simply recomputes it —
there is no stored balance to drift out of sync.

## 4. Core features (v1)

- **Create group:** title, base currency, member names → shareable link + QR code.
- **Add expense:** payer, total amount, **currency**, description, and a split that
  is either:
  - **Equal among a chosen subset** of members ("this ramen was just Alice, Bob,
    Dave"), or
  - **Exact per-person amounts** (someone ordered the wagyu). Exact shares must
    sum to the expense total (validated).
- **Live balances** and **minimal-transfer settle-up**, with **rounding options**
  (to 1 / 10 / 100 / 1000 of the base currency).
- **Real-time-ish sync** across members via smart polling (poll only when the tab
  is visible; back off when idle).
- **PWA:** Add to Home Screen → app icon + standalone window; **web push** for
  organizers on iOS 16.4+ / Android (guests never need it).
- **Edit / delete expenses.** Underlying ledger is append-only (soft delete) so
  history and D1 Time Travel stay coherent.

## 5. Explicitly OUT of scope for v1 (YAGNI)

Each is a clean fast-follow, deliberately deferred:

- Accounts / login (magic-link organizer accounts are a fast-follow).
- The Wise/FX affiliate CTA at settle-up. **Designed-for, not built.** Settle-up
  stays a clean, well-bounded seam so a "send via Wise at the real rate" CTA is a
  later addition, not surgery. Multi-currency is real from day one because it is
  both the wedge and the future hook.
- Ads (actively rejected — damages the clean-and-free positioning).
- Receipt photo scanning / OCR.
- Weighted / ratio splits (e.g. 2 rooms vs 1).
- Expense categories, CSV export.

## 6. Business shape

**Ship as a free portfolio-grade product with no monetization**, keeping the
FX-affiliate option exactly one component away.

- No ads, no paywall, no speculative affiliate code in v1.
- If monetization is ever switched on, the only aligned channel is an **FX
  referral at settle-up** (Wise ~£10/personal referral, no-expiry cookie; Revolut
  $10–50). Allsquare is uniquely positioned to know the exact high-intent moment
  ("Alice owes Bob ¥40,000 across a currency boundary").
- Bill splitters are hard to monetize; this is acknowledged, not wished away.

## 7. Architecture

```
React + Vite PWA  ──►  Hono API on Cloudflare Workers  ──►  D1 (SQLite)
   (Cloudflare Pages)      (edge, global)                    (Time Travel PITR)
        │                                                 Frankfurter (FX; cached in D1)
        └── smart polling for live updates
```

**Why Cloudflare (Workers + Hono + D1 + Pages):**

- **$0** on the free tier: D1 = 5 GB storage, 5M row reads/day, 100k row
  writes/day; Workers = 100k requests/day. Enormous headroom for a bill splitter
  (~15 rows per 10-expense group).
- **Affiliate-safe.** Vercel Hobby explicitly bans affiliate links and is
  non-commercial-only; the day a Wise link ships there, it violates ToS ($20/mo
  Pro required). Cloudflare free is the only $0 path that survives that day.
  *(To verify: confirm Cloudflare free-tier commercial-use terms — widely done,
  believed fine, but not found explicitly stated. 2-minute ToS read before any
  affiliate link ships.)*
- **No dead-link trap.** Supabase free **pauses a project after 7 days of DB
  inactivity** and requires manual dashboard unpause — disqualifying for an app
  whose value is "a link that still works weeks later." D1 scales to zero and
  auto-resumes with no manual step.
- **D1 Time Travel** = automatic, always-on point-in-time recovery to any minute
  in the last **7 days** (30 on paid), no manual snapshots. This is the **direct
  answer to walica's documented data-loss reputation** — one command restores to
  the minute before an incident.
- **Edge-global**, which genuinely helps an international travel audience.

**Why D1 + polling over Durable-Objects-per-group:** DO's headline advantage is
single-threaded consistency, but Allsquare's expenses are **append-only** — two
simultaneous inserts don't conflict, and settlement is derived, not stored. So
DO's main benefit largely evaporates for this product while its costs (new mental
model, DIY backups, separate index for cross-group queries) remain. D1 keeps the
familiar SQL model and hands us Time Travel for free. The one real constraint is
the polling request budget (~1,200 req/hr per open tab at 3s); mitigated by
visible-tab-only polling + idle backoff, and well inside 100k/day at launch scale.

**Platform: web-first, PWA-enhanced.** One URL serves both user types: a
zero-friction link for guests, an Add-to-Home-Screen app with push for organizers.
Native app is explicitly rejected for v1 — Apple Guideline 4.2 rejects
"repackaged website" wrappers, and a native install reintroduces exactly the
funnel (and incumbent advantage) that is Splitwise's moat.

## 8. Data model (SQLite / D1)

Money is stored as integer **minor units** (e.g. cents, yen). **No floats** for
money, ever.

- `groups` — `id`, `slug` (URL token), `title`, `base_currency`, `rounding`
  (1|10|100|1000), `created_at`
- `members` — `id`, `group_id`, `name`, `sort_order`
- `expenses` — `id`, `group_id`, `payer_member_id`, `amount_minor`, `currency`,
  `fx_rate_to_base`, `fx_rate_date`, `description`, `split_type`
  (`equal`|`exact`), `created_at`, `deleted_at` (soft delete)
- `expense_shares` — `expense_id`, `member_id`, `share_amount_minor`
  - For **exact** splits: one row per member with their exact share.
  - For **equal** splits: rows identify the member subset; share amounts derived
    at compute time (with rounding remainder distributed deterministically).
- `fx_rates` — `base`, `quote`, `date`, `rate` (cache of Frankfurter lookups;
  keyed by quote+date)

Balances are computed in base currency; per-expense original amount + currency are
preserved verbatim for display and audit.

## 9. Key data flows

**Add a ¥5,000 expense in a USD-base group:**
1. Client POSTs `{ payer, amount_minor: 500000, currency: JPY, split }`.
2. Worker resolves JPY→USD rate for today: check `fx_rates` cache → else
   Frankfurter → else carry forward the last published rate.
3. Store the expense **with the frozen `fx_rate_to_base` and `fx_rate_date`**.
4. Other members' next poll surfaces it; settle-up recomputes live.

**Settle up:**
1. For each non-deleted expense, convert to base via its **frozen** rate, apply
   the split, accumulate each member's net.
2. Apply the group's rounding setting.
3. Run minimal-transfer reduction → ordered list of "X pays Y amount."

## 10. Testing strategy

- **Settlement algorithm:** pure function, exhaustively unit-tested. A wrong number
  here destroys trust instantly — this is the highest-value test surface.
- **Money math:** property tests — balances always sum to zero; rounding never
  creates or destroys money; minor-unit integer math never overflows/loses cents.
- **FX freezing:** a rate stored at entry never changes on re-read, even as live
  rates move; carry-forward rule fires on weekends/holidays.
- **Split validation:** exact shares must sum to the total; equal-split remainder
  is distributed deterministically.
- **E2E:** create group → two members add cross-currency expenses → settle-up
  equals a hand-computed expectation.

## 11. Repo

- **New public repo** under `yuichi-9621`, named **`allsquare`**.
- TypeScript monorepo: `web/` (React + Vite PWA on Cloudflare Pages) and
  `worker/` (Hono API on Cloudflare Workers + D1).

## 12. Open items / risks

1. **Cloudflare free-tier commercial-use terms** — verify before any affiliate
   link ships (§7).
2. **Polling budget** — fine at launch; revisit visible-tab/idle-backoff tuning if
   real usage approaches the 100k req/day Workers ceiling.
3. **Exact-split complexity** — adds the `expense_shares` table + sum validation;
   accepted as worth it.
4. **Frankfurter dependency** — free and self-hostable, but a single external
   source; cache aggressively in `fx_rates` and tolerate carry-forward.
