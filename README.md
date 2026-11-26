# ShelfMate

**Tagline:** Your shop on every customer's WhatsApp. Take local orders, collect udhaar and restock on time.

**Vertical:** Kirana and general stores, pharmacies (chemists), small neighbourhood retail (dairy, bakery, stationery, pet, hardware).

## The one-line pitch

A QR standee at the counter and shop front opens the store's own catalog on the customer's phone. The order lands on the owner's WhatsApp for home delivery, with no commission. The same app runs the khata (credit ledger), sends polite WhatsApp payment reminders with a UPI link, and warns before stock runs out or expires.

## Who it is for (ICP)

| Attribute | Ideal customer |
|---|---|
| Store type | Kirana / general store or pharmacy with an existing local delivery habit (phone or WhatsApp orders) |
| Size | ₹1–10 lakh monthly sales, 1–4 staff, 150–800 regular households |
| Location | Dense residential pin codes in Tier 1–2 cities, where quick commerce is already live |
| Owner | 25–50 years, uses WhatsApp and UPI daily, keeps udhaar in a notebook or a free khata app |
| Trigger | Losing basket share to Blinkit/Zepto/Instamart; udhaar not coming back; stock-outs and expired stock |

## Top features (MVP first)

| Priority | Feature | Metric it moves |
|---|---|---|
| P0 | QR catalog to WhatsApp order (zero commission, owner's own number) | Retention, ARPU |
| P0 | Digital khata with WhatsApp reminders and UPI pay link | Activation, retention |
| P0 | Order inbox with status (accepted, packed, out for delivery, delivered) | Retention |
| P0 | Simple bill and GST invoice (PDF on WhatsApp) | Activation |
| P0 | Customer list with DPDP-compliant consent | Revenue (enables campaigns) |
| P1 | Inventory with low-stock and expiry alerts; distributor reorder on WhatsApp | ARPU |
| P1 | Offers and broadcast to opted-in customers; loyalty points | Retention, ARPU |
| P2 | ONDC listing via a seller-app partner; pharmacy pack (batch, expiry, Schedule H1 register) | Acquisition, ARPU |

## Pricing (summary)

| Plan | INR | USD (approx., ₹88/USD estimate) | For |
|---|---|---|---|
| Free | ₹0 | $0 | Khata + 50-item QR catalog, manual reminders |
| Dukaan | ₹299/month or ₹2,999/year | ~$3.4 / ~$34 | Single kirana: unlimited catalog, orders, automated reminders, GST bills |
| Dukaan Pro | ₹699/month or ₹6,999/year | ~$7.9 / ~$80 | Inventory, expiry, distributor reorder, offers, loyalty |
| Pharmacy Pro | ₹999/month or ₹9,999/year | ~$11.4 / ~$114 | Pro + batch/expiry, H1 register, refill reminders |

Message wallet top-ups, setup kit and ONDC listing are add-ons. Full detail: [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md).

## Why now

- Kiranas still hold about 91% of India's grocery market in CY2025 (RedSeer), but a retailer body attributes about 2 lakh store closures to quick commerce (Business Standard, Oct 2024). Sources in [docs/04-market-research.md](docs/04-market-research.md).
- Quick commerce orders doubled to about ₹64,000 crore in FY25 (CareEdge). The kirana's defence is speed plus relationship plus credit, which ShelfMate puts on WhatsApp.

## Status

**MVP, demo data, simulated messaging and payments.** Live site (planned): https://shelfmate.craftlayer.store. Product support: shelfmate@craftlayer.store.

The app runs end to end with one fictional store, "Annapurna Kirana Stores (Demo)" in Kothrud, Pune. WhatsApp/SMS messages are written to an outbox shown in the app; nothing is sent. Customers pay by UPI intent link (`upi://pay`); confirming the money arrived is manual (staff tap "UPI received") or simulated on the demo statement page.

## How to run

Needs Node 20.9+ and pnpm 11.

```bash
pnpm install
cp .env.example .env.local   # optional; defaults work for local dev
pnpm dev                     # http://localhost:3157
```

The first request creates a PGlite database in `.data/pglite` and seeds the demo store. `pnpm db:seed` resets it. Set `DATABASE_URL` to use a real Postgres instead. Checks: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Demo walkthrough

| Step | URL | What to do |
|---|---|---|
| 1 | `/` | Landing page; "Try the demo" |
| 2 | `/demo` | Demo hub with the store QR and sign-in shortcuts |
| 3 | `/s/demo-annapurna-7Qx2` | Customer QR catalog: add items, pick delivery or pickup and a slot, UPI / cash / khata, tick the optional WhatsApp consents, place the order |
| 4 | `/o/<token>` | Order tracking with live status, UPI pay button and "Send order on WhatsApp" (wa.me) |
| 5 | `/login?as=staff` | Counter staff, phone 90000 10002; the OTP is shown on screen (demo) |
| 6 | `/app/orders` | Live queue: Accept, Mark packed, Out for delivery, Delivered (creates the GST invoice; khata orders post to the ledger) |
| 7 | `/app/bill` | Quick bill, then print or WhatsApp the GST invoice |
| 8 | `/app/khata` | Balances, credit limits, add udhaar or payment, WhatsApp reminders, consent log |
| 9 | `/k/<token>` | Customer's khata statement: pay by UPI, simulate payment (demo), switch messages on or off, STOP |
| 10 | `/app/stock` | Low-stock and expiry alerts, receive stock, batches, reorder on WhatsApp |
| 11 | `/app/messages` | Simulated WhatsApp/SMS outbox, including messages skipped for lack of consent |
| 12 | `/login?as=owner` | Owner, phone 90000 10001: `/app/dashboard`, `/app/offers`, `/app/settings`, `/app/qr` (printable standee) |

## Built vs planned

| Feature | State |
|---|---|
| QR catalog, cart, delivery/pickup slot, UPI intent / COD / khata, wa.me order message | Built |
| Order queue with statuses and customer updates | Built |
| Khata ledger, credit limits, statement link, WhatsApp reminders with UPI link | Built (reminders are manual "remind" / "remind all", not yet scheduled) |
| GST invoice (HSN, CGST/SGST, HSN summary, bill of supply for composition, printable) | Built (PDF via browser print) |
| Customer list with DPDP consent log per purpose, opt-out, STOP | Built |
| Owner dashboard (sales, udhaar outstanding and recovered, top items, repeat customers, offer results) | Built |
| Inventory: stock, low-stock alerts, batches with expiry alerts, WhatsApp reorder list | Built (P1) |
| Offers to opted-in customers, with results | Built (P1, simple) |
| Phone + OTP sign-in, owner/staff roles | Built (OTP shown on screen in demo) |
| Onboarding wizard, starter SKU library, CSV/photo import | Planned |
| Real WhatsApp BSP, payment gateway webhooks, scheduled reminders | Planned (adapters in place) |
| Loyalty, barcode billing, Indian languages, ONDC, pharmacy H1 register | Planned |

## Documents

| File | Contents |
|---|---|
| [AGENTS.md](AGENTS.md) | Brief for AI agents: context, glossary, reading order, decisions, open questions |
| [docs/01-product-plan.md](docs/01-product-plan.md) | Vision, personas, journeys, features by phase, data model, metrics |
| [docs/02-problems-and-benefits.md](docs/02-problems-and-benefits.md) | Problem, solution, benefit per stakeholder |
| [docs/03-pros-cons-risks.md](docs/03-pros-cons-risks.md) | Pros, cons, risks, mitigations, kill criteria |
| [docs/04-market-research.md](docs/04-market-research.md) | Market size, competitors, pricing benchmarks, trends, regulation, sources |
| [docs/05-pricing-and-revenue.md](docs/05-pricing-and-revenue.md) | Tiers, add-ons, unit economics, 12-month scenarios |
| [docs/06-go-to-market-and-onboarding.md](docs/06-go-to-market-and-onboarding.md) | Channels, sales script, objections, onboarding, retention |

Shared platform modules are described in [core/README.md](https://github.com/craftLayer-studio/craftlayer-core/blob/main/README.md).

## Licence

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Personal, educational, research and non-profit use is free. **Any commercial use requires a paid licence or written permission from CraftLayer Studio.** See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Part of the [CraftLayer Products](https://github.com/craftLayer-studio/craftlayer-products) portfolio.
