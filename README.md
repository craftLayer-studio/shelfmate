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

Shared platform modules are described in [core/README.md](../core/README.md).
