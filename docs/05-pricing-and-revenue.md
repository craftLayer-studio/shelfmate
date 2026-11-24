# ShelfMate pricing and revenue

Exchange rate used: ₹88 = US$1 **(estimate)**. Prices exclude 18% GST. Competitor anchors are in [04-market-research.md](04-market-research.md).

## Pricing logic

- Billing apps set the floor: myBillBook ₹399–3,000/year, Vyapar ₹699–4,799/year, Swipe ₹2,999/year. A kirana base plan above ₹3,000/year needs a reason the billing apps do not give. ShelfMate's reason is orders in and udhaar back.
- Pharmacies already pay ₹5,550–9,999/year for Marg or Gofrugal-class software, so a separate pharmacy plan can carry ₹9,999/year.
- No commission on orders. This is the main contrast with Dukaan's per-order fee and with marketplaces.
- Khata stays free because Khatabook and OkCredit are free. Automation (reminders, unlimited catalog) is paid.

## Tiers

| | Free | Dukaan | Dukaan Pro | Pharmacy Pro |
|---|---|---|---|---|
| Monthly | ₹0 | ₹299 (~$3.4) | ₹699 (~$7.9) | ₹999 (~$11.4) |
| Annual (2 months free) | ₹0 | ₹2,999 (~$34) | ₹6,999 (~$80) | ₹9,999 (~$114) |
| QR catalog items | 50 | Unlimited | Unlimited | Unlimited |
| QR / WhatsApp orders | 50 per month | Unlimited | Unlimited | Unlimited |
| Khata ledger | Yes | Yes | Yes | Yes |
| Reminders | Manual share (owner sends from own WhatsApp) | Automated, 200 utility messages/month included | 600 utility + 100 marketing/month | 1,000 utility + 150 marketing/month |
| Bills and GST invoice | 20 per month | Unlimited | Unlimited | Unlimited |
| Inventory, low stock, expiry | No | Low stock for 50 SKUs | Full, batch and expiry | Full, batch-mandatory |
| Distributor reorder | No | No | Yes | Yes |
| Offers, broadcast, loyalty | No | No | Yes | Yes |
| Staff logins | 1 | 2 | 4 | 4 |
| Pharmacy (Rx gating, H1 register, refill reminders) | No | No | No | Yes |
| Support | In-app | WhatsApp | WhatsApp + rep visit | WhatsApp + rep visit |

Trial: 30 days of Dukaan Pro free for every new store, then drop to Free unless they pay.

## Add-ons

| Add-on | Price | Cost to us (estimate) | Notes |
|---|---|---|---|
| Message wallet | ₹1.40 per marketing message, ₹0.25 per utility message | ₹1.09 / ₹0.145 (BSP-listed rates, docs/04) + GST | ~25–70% markup; prepaid only |
| Setup kit (2 acrylic standees + shutter sticker + 100 bag stickers) | ₹499 one-time (waived on annual) | ~₹200 | Printed locally |
| Done-for-you catalog (up to 500 SKUs) | ₹999 one-time | ~₹300 staff time | For larger stores |
| ONDC listing (P2) | ₹199/month | Partner fee (unknown) | Via seller-app partner |
| Extra store (multi-store) | ₹249/month per store | Infra only | P2 |
| Bluetooth thermal printer | Pass-through at MRP + ₹200 | Hardware cost | Optional |

## Revenue streams

| Stream | Phase | Share of revenue at month 12 (estimate) |
|---|---|---|
| Subscriptions | P0 | ~85% |
| Message wallet margin | P1 | ~8% |
| Setup kits and done-for-you catalog | P0 | ~5% |
| ONDC add-on | P2 | ~2% |
| Loan referral fees (NBFC partner), brand-funded offers | P2 | Upside, not in plan |

## Unit economics (estimate)

| Item | Value | Reasoning |
|---|---|---|
| Plan mix | 70% Dukaan, 25% Dukaan Pro, 5% Pharmacy Pro | Pilot hypothesis |
| Blended subscription ARPU | ~₹405/month | Mix x effective monthly price (half on annual) |
| Wallet + add-ons | ~₹45/month | 30% of stores buy ~₹150 of messages |
| **Blended ARPU** | **~₹450/month (~$5.1)** | |
| WhatsApp cost of included messages | ~₹70/month | Average included usage at ₹0.145 utility and ₹1.09 marketing |
| Infra, hosting, SMS OTP | ~₹30/month | Shared core |
| Support | ~₹40/month | 1 support agent per ~600 stores |
| **Gross margin** | **~69% (~₹310/month)** | |
| Field rep cost | ₹22,000 salary + ₹4,000 travel + ₹200 incentive per paid store | Tier 2 city field sales (estimate) |
| Rep productivity | 25 paid stores/month after ramp | Visits 12–15 stores/day, ~8% close to paid |
| **CAC** | **~₹1,400–1,500** | (₹26,000 + ₹5,000 incentives) / 25 + ₹150 kit subsidy |
| **Payback** | **~4.5–5 months** | CAC / gross margin per month |
| Monthly logo churn target | 4% | Expected lifetime ~25 months |
| **LTV** | **~₹7,700** | ₹310 x 25 |
| LTV / CAC | ~5x | |

Annual prepay at ₹2,999 recovers CAC on day 1. Push annual with the free setup kit.

## 12-month scenarios (estimate)

Assumptions: launch month 3 after MVP build; first 2 months founder-led; reps added as stated; churn 4%/month; ARPU ₹450.

| Scenario | Sales capacity | Paid stores, month 12 | MRR, month 12 | ARR run-rate | Cumulative revenue, months 1–12 |
|---|---|---|---|---|---|
| Conservative | Founder + 1 rep | 250 | ₹1.1 lakh (~$1,280) | ₹13.5 lakh | ~₹5 lakh |
| Base | Founder + 3 reps from month 5 | 600 | ₹2.7 lakh (~$3,070) | ₹32 lakh | ~₹12 lakh |
| Aggressive | 6 reps + distributor-salesman referral channel | 1,500 | ₹6.75 lakh (~$7,670) | ₹81 lakh | ~₹28 lakh |

Break-even for ShelfMate's own team (2 engineers shared with core, 1 support, reps) needs about 1,200–1,500 paid stores (estimate). The base case gets there in month 15–18.

## Upsell paths

| From | To | Trigger in product |
|---|---|---|
| Free | Dukaan | 50-order or 50-item limit hit; "You have ₹X udhaar older than 30 days. Turn on auto-reminders" |
| Dukaan | Dukaan Pro | Low-stock list shows stock-outs; 150+ customers with marketing consent; reminder quota used 2 months running |
| Dukaan Pro | Pharmacy Pro | Store type is pharmacy; H1 entries started |
| Any | Annual | Month 2 renewal offer: setup kit free + 2 months free |
| Any | Wallet top-up | Campaign planned beyond quota |
| Any | ONDC add-on | 30+ orders/week and spare delivery capacity |
