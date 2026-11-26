# ShelfMate: brief for AI agents

## Context

ShelfMate is CraftLayer's vertical SaaS for kirana stores, general stores, pharmacies and small neighbourhood retail in India. It is built on the shared CraftLayer core (see [core/README.md](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md)). The wedge is a QR standee that opens the store's catalog and sends the order to the owner's WhatsApp for home delivery. The second hook is the khata (credit ledger) with WhatsApp payment reminders. Billing, inventory, distributor reorder, CRM offers, loyalty and ONDC come after the wedge works.

The business goal is fast revenue from a large, price-sensitive base. Every feature must name the metric it moves (acquisition, activation, retention, ARPU, referral).

## Reading order

1. [README.md](README.md): one-page summary.
2. [docs/01-product-plan.md](docs/01-product-plan.md): what we build and in what order.
3. [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md): how it makes money.
4. [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md): how we sell it.
5. [docs/04-market-research.md](docs/04-market-research.md): evidence and sources.
6. [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md) and [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md).

## Glossary

| Term | Meaning |
|---|---|
| Kirana | Neighbourhood grocery / general store, usually owner-run |
| Khata / udhaar | Customer credit ledger; "udhaar" is goods taken on credit |
| Quick commerce (q-comm) | 10–30 minute delivery apps: Blinkit, Zepto, Swiggy Instamart, Flipkart Minutes, BigBasket Now |
| Distributor / stockist | Wholesaler supplying FMCG brands to the store; salesman visits on a beat |
| ONDC | Open Network for Digital Commerce, government-backed open e-commerce protocol; stores join through a seller-side app |
| Schedule H / H1 / X | Prescription-drug schedules under the Drugs and Cosmetics Rules 1945; H1 needs a separate register kept 3 years |
| Utility / marketing message | Meta WhatsApp Business Platform message categories, priced per message in India |
| Service window | 24 hours after a customer's last message, when free-form replies are not charged |
| DPDP | Digital Personal Data Protection Act 2023 and DPDP Rules 2025 |
| Standee | Printed QR stand placed at the counter; also a shutter/door sticker |

## Decisions made

| Decision | Reason |
|---|---|
| Orders flow into the owner's own WhatsApp number, plus a ShelfMate inbox | Owners already take WhatsApp orders; no behaviour change, no commission |
| Zero commission on orders; revenue is subscription plus message wallet | Directly contrasts with marketplace fees (Dukaan free plan 4.99% per order, see docs/04) and q-comm |
| Free tier exists (khata + small catalog) | Khatabook/OkCredit/Vyapar have free khata; a paywall on khata loses the deal |
| Automated reminders use utility templates; promotions use marketing templates with opt-in | Meta policy and DPDP consent; budgets in docs/05 |
| Pharmacy is a separate plan with Rx-only items blocked from QR ordering by default | Drug-rule exposure; see docs/03 |
| ONDC via an existing seller-app partner (P2), not our own integration | Lower build cost; ONDC kirana volume is still small |
| Field + distributor-salesman channel first, not paid ads | Kirana owners buy face to face; see docs/06 |

## Open questions

1. **Name check.** No major retail-software brand called ShelfMate was found in India. A small Australian inventory app, "ShelfMate Inventory" (SHELFMATE PTY LTD, App Store, released Oct 2025, https://appadvice.com/app/shelfmate-inventory/6748490252, accessed 2026-11-24), uses the name. Not a major conflict, but run an Indian trademark search (classes 9, 35, 42) before printing standees. Backup names if blocked: **GaliMart** (gali = lane) and **DukaanDost**.
2. Which WhatsApp BSP (or direct Cloud API) gives the lowest landed cost per utility message after the 1 October 2026 change that charges utility templates inside the service window?
3. Does the ₹299 Dukaan plan convert from free at 15% or better? Validate in the first 2 pin codes.
4. Which ONDC seller-app partner (for example Kiko Live or a DigiDukaan participant) will white-label listing at a price that leaves margin on the ₹199 add-on?
5. Delivery: do we stay "owner delivers" or integrate a hyperlocal rider partner for stores without a delivery boy?
6. Pharmacy scope: do we allow prescription-upload orders for Schedule H items, or only OTC, until the e-pharmacy legal position is clear?

## Rules for agents editing these docs

- Follow [CONVENTIONS.md](https://github.com/craftLayer-studio/craftlayer-products/blob/main/CONVENTIONS.md): every number needs a source link and access date or an **(estimate)** label.
- Reference core modules; do not re-specify them.
- Keep prices consistent across README, 05 and 06.

<!-- ASTRYX:START -->
Astryx v0.7.17 · 174 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx component <Name>` to read props before using one; `astryx template <Block>` prints a block example to read for a part it lacks. Astryx names differ from other libraries: buttons, badges, tokens and tabs take their text in `label` (Text, Heading and Link take children), booleans start with `is` or `has` (`isOpen`, `isDisabled`), and every input takes `value` and `onChange`.
Changing an existing page? Keep it: skip step 2 and add components inside its sections; read a block example when it helps.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides; so does a denser or roomier app (`editor set <name> spacing tight`), never gap and padding changes page by page. A change to one kind of part (the sidebar, its selected item, the gaps in a form) is a theme change too, not props on one page: `editor how "<ask>"` names the `set … --on <part>` line. No app yet: `astryx experimental theme preview app <dir>` makes a starter app that shows the theme. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` (takes pictures of real components) and open the PNGs it writes; a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
To remove this block, run `astryx init --remove-agents`, which removes it from the agent files at the project root and in the folder you run it in; from any other file it leaves, delete everything from ASTRYX:START to ASTRYX:END.
<!-- ASTRYX:END -->

## Code

ShelfMate MVP: Next.js 16 (App Router, webpack), React 19, TypeScript strict, Drizzle ORM on Postgres (PGlite in dev and tests), Astryx design system with the `butter` theme.

### Structure

| Path | What lives there |
|---|---|
| `src/domain/` | Pure business rules, no React/Next/IO: money (paise), phone (E.164), quantities (milli units for loose items), cart pricing, GST invoice split, order status machine, delivery slots, khata balance and credit limits, DPDP consent, message texts, stock and expiry alerts, dashboard maths. Tests in `domain.test.ts`. |
| `src/server/db/` | Drizzle schema, client (`DATABASE_URL` uses `pg`, else PGlite file DB at `.data/pglite`), SQL migrations, demo seed. |
| `src/server/store/` | Data access and use cases. Every function takes a `Ctx` (org, user, role) or a public token and filters by `org_id`. Integrations are adapters: `messaging.ts` (simulated WhatsApp/SMS, writes `outbox`), `payments.ts` (simulated confirmation). |
| `src/server/http.ts`, `session.ts`, `ratelimit.ts` | Input validation, signed httpOnly session cookie, in-memory rate limiter. |
| `src/app/api/` | Thin route handlers: parse, validate, call the store, return JSON. `public/*` (no login, rate-limited), `staff/*`, `owner/*`. |
| `src/app/s`, `o`, `k` | Customer pages: QR catalog, order tracking, khata statement and message preferences. |
| `src/app/app/*` | Staff and owner screens (orders, bill, khata, stock, messages, dashboard, offers, settings, QR sheet). |
| `src/components/` | Client components built from Astryx. |

### Commands

```bash
pnpm install
pnpm dev                 # http://localhost:3157, auto-seeds the demo store into an empty DB
pnpm db:seed             # wipe and reseed the demo store
pnpm db:generate         # new SQL migration after editing schema.ts (commit it)
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm exec astryx doctor --built .next
```

### Rules

- Money is integer paise; quantities are integer milli units. Never trust client prices or totals; price carts in `priceCart`.
- Order status changes go through `nextStatuses`/`canTransition` in `src/domain/order.ts`.
- Every customer message goes through `sendToCustomer`, which checks consent for the purpose (service vs marketing) and logs skipped sends. Never call a messaging adapter directly for customers.
- Roles are enforced on the server: `requireCtx("owner")` in routes, `requireOwner(ctx)` in the store.
- Public tokens (QR, order, statement) are random 128-bit values, never sequential ids.
- UI: Astryx components and tokens only, no raw `div`/`span`, hex or px. Server pages cannot pass render functions to client components; use `DataTable` with pre-formatted rows.
- Demo data stays fictional and labelled "Demo". No real API keys, no network calls to third parties.
- Commits: conventional subjects (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). No AI co-author trailers or "Generated with" lines.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
