# ShelfMate product plan

## Vision

Every neighbourhood store keeps its customers when a 10-minute app opens nearby. The store does this by being one tap away on WhatsApp, by knowing each household, and by getting its credit back on time.

## Positioning

| Against | ShelfMate's angle |
|---|---|
| Quick commerce (Blinkit, Zepto, Instamart) | Same-hour delivery from a known shop, credit allowed, loose items and local brands, no app download for the customer |
| Free khata apps (Khatabook, OkCredit) | Khata is included; ShelfMate also brings orders in, so it earns its fee |
| Billing apps (Vyapar, myBillBook, Swipe) | Billing is included; the product is built around customer orders and collections, not accounting |
| Online-store builders (Dukaan) | No per-order commission; ordering lives on the owner's own WhatsApp |
| Heavy POS (Gofrugal, Marg) | Phone-first, set up in 30 minutes, ₹299 a month |

## ICP and personas

| Persona | Description | Job to be done |
|---|---|---|
| Owner (primary buyer) | Ramesh, 42, runs a 300 sq ft kirana in a Pune housing area; 10–25 WhatsApp/phone orders a day; ₹60,000–1,50,000 udhaar outstanding (estimate) | "Keep my regular customers ordering from me, get my udhaar back, never run out of fast movers" |
| Pharmacist owner | Sunita, 38, chemist with drug licence; refill customers for BP/diabetes; expiry losses | "Remind refill customers before they buy elsewhere; stop expiry write-offs; keep the H1 register clean" |
| Counter staff / son or daughter | Packs orders, updates status, does billing on phone | "One screen with today's orders and what to pack" |
| Delivery boy | Delivers within 1–3 km | "Know address, amount to collect, and whether it is on khata" |
| End customer | Household 0.5–2 km away | "Order from my usual shop without calling; see what is in stock; pay by UPI or add to khata" |

## Core user journeys

1. **Customer orders via QR.** Customer scans the counter standee or shutter sticker. The catalog opens in the browser (no app). They add items, choose delivery or pickup, and pick "UPI now", "cash on delivery" or "add to khata" (only if the owner has enabled khata for that number). Checkout sends a pre-filled WhatsApp message to the store and logs the order in the ShelfMate inbox. The first order captures name, phone and consent for order updates; marketing consent is a separate unticked box.
2. **Owner fulfils.** The order appears in the inbox and on WhatsApp. The owner taps Accept, edits for out-of-stock substitutes, and taps Packed and then Out for delivery. Status replies go inside the 24-hour service window as free-form messages where possible.
3. **Khata collection.** Every credit sale appends to the ledger. On the owner's chosen day (for example the 1st and 15th), ShelfMate sends a utility template: "Your balance at Sharma Stores is ₹1,240. Pay by UPI: <link>". A payment through the link marks the entry settled automatically.
4. **Restock.** When stock of a tracked SKU falls below its minimum, the owner gets a morning list. One tap sends a purchase order to the distributor's WhatsApp.
5. **Win-back offer.** Customers inactive for 21 days with marketing consent get a "Fresh atta arrived, 5% off this week" message, limited by a monthly budget.

## Features by phase

### Phase 1: MVP, sellable in 6–8 weeks (P0)

**Build status (2026-11-26):** built in this repo unless marked otherwise. Onboarding wizard and starter catalog import are not built yet (the demo store is seeded); reminders are sent on demand, not on a schedule; WhatsApp and payments use simulated adapters.

| Feature | Detail | Metric | Core module |
|---|---|---|---|
| Onboarding wizard (not built) | Shop name, UPI ID, delivery radius, hours; 30-minute target | Activation | Onboarding wizard |
| Starter catalog (not built; manual add/edit built) | Preloaded library of ~2,000 common kirana SKUs with images and MRP; owner ticks what they stock; photo-to-item and CSV import | Activation | Catalog |
| QR standee + shutter sticker (built: printable sheet) | Unique store QR; printed kit shipped or handed over | Acquisition (customer side) | QR engine |
| Web catalog + cart to WhatsApp (built) | Search, categories, loose-item quantity (kg/g), notes, substitutes allowed toggle | Retention, ARPU | Storefront, ordering engine |
| Order inbox (built) | Accept/edit/packed/out for delivery/delivered; daily order count | Retention | Ordering engine, staff app |
| Khata ledger (built, tap entry) | Add credit/payment by voice or tap; per-customer balance; shared statement link | Activation, retention | CRM |
| Payment reminders (built, on demand) | Scheduled utility templates with UPI link (Razorpay/UPI intent); auto-reconcile | Retention (owner sees cash back) | Messaging, payments |
| Bill / GST invoice (built) | Bill PDF on WhatsApp; GSTIN, HSN, tax split; composition-dealer "bill of supply" mode | Activation | Payments |
| Customer list + consent (built) | Consent log per number and purpose; one-tap opt-out ("STOP") | Compliance, revenue later | CRM |
| Owner dashboard (built) | Today's orders, sales, udhaar outstanding, udhaar recovered this month | Retention | Analytics |

**MVP build estimate:** 2 engineers + 1 designer for 6–8 weeks, reusing core QR, storefront, CRM, payments and messaging (estimate; assumes core modules exist).

### Phase 2: months 3–6 (P1)

| Feature | Metric |
|---|---|
| Inventory: stock counts for top 200 SKUs, low-stock alert, expiry date per batch, near-expiry list (built) | ARPU (Pro upsell) |
| Distributor book: supplier list, one-tap WhatsApp purchase order, pending payables | ARPU, retention |
| Offers and broadcast: segment by last order date or basket; monthly message budget (built: segment by 21-day inactivity, no budget yet) | Retention, ARPU (wallet) |
| Loyalty: points per ₹100, redeem on next order | Retention |
| Delivery slots and delivery-boy view (address, amount, khata flag) (slots built) | Retention |
| Barcode scan billing on phone camera | Activation for larger stores |
| Hindi, Marathi, Tamil, Telugu, Kannada, Bengali UI | Acquisition |

### Phase 3: months 6–12 (P2)

| Feature | Metric |
|---|---|
| ONDC listing through seller-app partner, orders merged into inbox | Acquisition (new customers), ARPU |
| Pharmacy pack: batch/expiry by default, Schedule H1 register export, Rx photo on order, refill reminders | ARPU (Pharmacy Pro) |
| Credit risk view: days outstanding, customer limit, auto-block khata at limit | Retention |
| Working-capital loan referral via NBFC partner using sales + khata data | Revenue (referral fee) |
| Tally / accountant export | Retention |
| Multi-store and staff roles | ARPU |
| Brand-funded offers (FMCG trade schemes pushed to opted-in customers) | Revenue |

## Data model (key entities)

| Entity | Key fields |
|---|---|
| Store | id, name, type (kirana/pharmacy/other), GSTIN, composition flag, drug licence no., UPI ID, address, radius_km, hours, plan |
| Product | id, store_id, name, brand, unit (pc/kg/l), MRP, price, HSN, GST rate, schedule (none/H/H1/X), track_stock flag, min_stock |
| Batch | id, product_id, batch_no, expiry_date, qty, cost |
| Customer | id, store_id, phone, name, address, khata_enabled, credit_limit, tags |
| Consent | customer_id, purpose (order_updates / reminders / marketing), source (QR/manual), timestamp, status, withdrawn_at |
| Order | id, store_id, customer_id, items, total, channel (QR/ONDC/manual), payment_mode, status, timestamps |
| KhataEntry | id, customer_id, type (credit/payment), amount, order_id, note, created_by |
| Reminder | id, customer_id, template, sent_at, cost, result (paid/no action) |
| Supplier | id, store_id, name, phone, payable |
| PurchaseOrder | id, supplier_id, items, status |
| Campaign | id, segment, template, budget, sent, orders_attributed |

## Integrations

| Integration | Purpose | Phase |
|---|---|---|
| WhatsApp Business Platform (Cloud API via BSP) | Reminders, order updates, offers | P0 |
| WhatsApp click-to-chat (wa.me) | Customer to owner order message, free | P0 |
| Razorpay / UPI intent and payment links | Collect khata and order payments | P0 |
| Thermal Bluetooth printer (optional) | Bills | P1 |
| ONDC seller-app partner API | Listings and orders | P2 |
| NBFC partner | Loan referral | P2 |
| Tally export | Accountant | P2 |

## Success metrics

| Metric | Definition | 90-day target (estimate) |
|---|---|---|
| North star | WhatsApp/QR orders per paying store per week | 30+ |
| Activation | Store with catalog of 100+ items, standee placed, 5 customer orders in first 14 days | 60% of sign-ups |
| Khata recovery | ₹ udhaar collected via reminder links per store per month | ₹15,000+ |
| Free to paid | Free stores upgrading within 30 days | 15%+ |
| Logo churn | Paid stores cancelling per month | under 4% |
| Referral | Paid stores that refer another store | 20% |
