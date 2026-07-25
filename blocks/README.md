# Altay Studio: Headless Blocks Manifest

This is the central registry of all decoupleable subsystems (Blocks) within the Altay Studio ecosystem. 

When generating a bespoke site, the AI reads the `instructions.md` within the requested block to generate the frontend "Skin", whilst utilizing the block's `schema.sql` for the database and `engine.ts` for the business logic.

## 🧩 Core Blocks
These blocks are universally applicable to almost all local service businesses.

| Block Name | Subdirectory | Purpose | Status |
|---|---|---|---|
| **Lead Generator** | `blocks/core/lead_generator` | Captures prospects and manages simple CRM pipeline. | `[PRODUCTION READY]` |
| **Booking Calendar** | `blocks/core/booking_calendar` | Drag-and-drop scheduling with Google Calendar Sync. | `[PRODUCTION READY]` |
| **AI Receptionist** | `blocks/core/ai_receptionist` | Text/Voice AI triage agent for inbound queries. | `[SCAFFOLDED]` |
| **SEO & Discoverability** | `blocks/core/seo` | `llms.txt` and meta-tag injection for crawler visibility. | `[PRODUCTION READY]` |
| **Client 360 CRM** | `blocks/core/crm_client_360` | Unified demographics, service history, and notes. | `[PRODUCTION READY]` |
| **Payments & Invoicing** | `blocks/core/payments_invoicing` | Stripe prepayments, invoicing, and subscription billing. | `[PRODUCTION READY]` |
| **Automated Campaigns** | `blocks/core/automated_campaigns`| Email/SMS drip sequences (e.g., "Time for a touch-up"). | `[SCAFFOLDED]` |
| **Review & Feedback** | `blocks/core/review_feedback` | NPS surveys routing to Google Reviews. | `[SCAFFOLDED]` |
| **Analytics Dashboard** | `blocks/core/analytics_dashboard`| KPIs (LTV, ROMI, no-show rates) and reporting views. | `[SCAFFOLDED]` |
| **Agent OS** | `blocks/core/agent_os` | Autonomous AI agent brain — event-driven Claude ReAct loop with pgvector memory. | `[PRODUCTION READY]` |

---

## ⚕️ Medical & Salons
Highly regulated or high-volume service businesses requiring specific logic.

| Block Name | Subdirectory | Purpose | Status |
|---|---|---|---|
| **Compliance & Consent** | `blocks/medical_and_salons/compliance_consent`| HIPAA digital waivers, e-signatures, audit logs. | `[SCAFFOLDED]` |
| **Loyalty Memberships**| `blocks/medical_and_salons/loyalty_memberships`| Package tracking (e.g., 5-pack of Botox), VIP tiers. | `[SCAFFOLDED]` |
| **Waitlist Management** | `blocks/medical_and_salons/waitlist_management`| Walk-in kiosk, auto-SMS next-in-line. | `[SCAFFOLDED]` |
| **Staff Commission** | `blocks/medical_and_salons/staff_commission` | Automated payout splits and tip tracking. | `[SCAFFOLDED]` |
| **Client Gallery** | `blocks/medical_and_salons/client_gallery` | Before/after photos tied to client profiles. | `[SCAFFOLDED]` |

---

## 🍽️ Restaurants
High-velocity, transactional hospitality systems.

| Block Name | Subdirectory | Purpose | Status |
|---|---|---|---|
| **Menu Management** | `blocks/restaurants/menu_management` | Digital menus with allergen flags and upsells. | `[SCAFFOLDED]` |
| **Online Ordering** | `blocks/restaurants/online_ordering` | Cart checkout, delivery routing, promo codes. | `[SCAFFOLDED]` |
| **Table Reservations** | `blocks/restaurants/table_reservations`| Party tracking, table mapping, no-show alerts. | `[SCAFFOLDED]` |

---

## 🛠️ Contractors & Home Services
Field-based operations (HVAC, Plumbing, Landscaping).

| Block Name | Subdirectory | Purpose | Status |
|---|---|---|---|
| **Dispatch & Routing** | `blocks/contractors/dispatch_routing` | Tech GPS tracking, job boards, en-route SMS. | `[SCAFFOLDED]` |
| **Inventory Tracking** | `blocks/contractors/inventory_tracking` | Truck stock levels, supply chain low-alerts. | `[SCAFFOLDED]` |
| **Estimates & Quotes** | `blocks/contractors/estimates_quotes` | PDF proposal generation, e-signatures. | `[SCAFFOLDED]` |
| **Job Costing** | `blocks/contractors/job_costing` | Tracking material/labor expenses vs estimates. | `[SCAFFOLDED]` |
| **Change Orders** | `blocks/contractors/change_orders` | Mid-job scope alterations and approvals. | `[SCAFFOLDED]` |

---

## Extending Blocks
To build a new block:
1. Identify the appropriate subdirectory.
2. Create the block folder.
3. Write the 3 pillars: `schema.sql`, `engine.ts`, and `instructions.md`.
4. Update this Manifest to list the new block as `[SCAFFOLDED]`.
