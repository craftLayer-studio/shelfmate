# ShelfMate pros, cons and risks

## Pros

| Pro | Why it matters |
|---|---|
| Huge base: about 13–14 million kirana stores (RedSeer, docs/04) | Even 0.1% penetration is 13,000 stores |
| Urgent, emotional pain (q-comm threat, udhaar) | Shorter sales cycle than "efficiency" software |
| Wedge uses behaviour owners already have (WhatsApp orders, UPI) | Low training cost |
| Zero-commission story is simple and contrasts with marketplaces | Easy to pitch in one sentence |
| Reuses CraftLayer core (QR, storefront, CRM, messaging, payments) | MVP in 6–8 weeks |
| Data asset (sales + khata) opens lending referral and brand-funded offers later | Revenue beyond subscription |

## Cons

| Con | Impact |
|---|---|
| Very price-sensitive buyers; free khata and cheap billing apps exist (Vyapar mobile from ₹699/year, myBillBook Silver ₹399/year, docs/04) | ARPU ceiling around ₹300–700/month |
| Field sales needed; low ticket makes CAC hard | Must keep CAC under ₹1,500 |
| Catalog setup is tedious (hundreds of SKUs, loose items) | Activation drop-off risk |
| Owner delivery capacity limits order growth | North-star ceiling per store |
| Crowded "kiranatech" space; several startups pivoted or shut | Investor and buyer scepticism |

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-to-paid conversion below 10% | Medium | High | Gate automated reminders and unlimited catalog, not khata; show "₹ recovered by ShelfMate" on dashboard before asking for payment |
| WhatsApp message cost rises (Meta raised India marketing rate about 10% on 1 Jan 2026; utility templates in service window charged from 1 Oct 2026, docs/04) | High | Medium | Message quotas per plan, prepaid wallet with markup, prefer free-form replies in service window, batch reminders twice a month |
| WhatsApp number ban for spam reports | Medium | High | Marketing only with opt-in, frequency caps, quality-rating monitor, STOP keyword |
| DPDP non-compliance (consent, notice, retention) | Medium | High | Consent per purpose logged at capture; notice in Hindi/English; deletion on request; ShelfMate acts as processor, store as fiduciary, written in terms |
| Pharmacy: selling Schedule H/H1/X drugs through online orders without valid prescription | Medium | High | Rx items hidden from QR catalog by default; Rx photo required if enabled; owner must verify before dispatch; no Schedule X ever |
| Q-comm offers kiranas a partner programme or price war deepens | Medium | Medium | Position ShelfMate as the store's own channel that coexists with any partner listing; add ONDC |
| Owners stop using after novelty | High | High | Weekly WhatsApp digest to owner ("you got 34 orders and ₹18,200 udhaar back"); field rep visit on day 7 and 30 |
| Catalog setup too slow | High | Medium | Preloaded SKU library, photo import, setup done by rep at first visit |
| Khata dispute or wrong reminder damages owner-customer relationship | Low | Medium | Owner approves reminder list before first send; editable message text |

## Kill criteria

Stop or pivot ShelfMate if any of these hold after the stated period:

| Signal | Threshold | Checkpoint |
|---|---|---|
| Free-to-paid conversion | under 10% of activated stores | Week 12 after launch in first 2 pin codes |
| Order wedge not working | under 30% of paid stores receive 20+ QR/WhatsApp orders per month | Month 3 |
| Churn | paid logo churn above 8% per month for 3 straight months | Month 6 |
| CAC payback | above 9 months on gross margin | Month 6 |
| Field productivity | a rep closes under 15 paid stores per month after 2 months of ramp | Month 4 |

If the order wedge fails but khata reminders show strong usage and payment, pivot to a "collections" product (reminders + UPI reconciliation) priced per recovered rupee.
