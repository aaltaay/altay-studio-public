# Distribution Strategy (The Discovery Block)

This document outlines the advanced distribution and local SEO technologies we employ beyond standard on-page SEO. For local businesses (salons, clinics, contractors), distribution across the entire digital ecosystem is just as important as the website itself.

## 1. AI Syndication & Aggregation
To ensure consistency across the internet, we utilize AI-powered aggregator platforms (e.g., BrightLocal, Yext, or SOCi).
- **Connector Strategy:** We do NOT build this infrastructure in-house. We build API connectors from the client's `schema` to these 3rd party tools.
- **NAP Syncing:** We automatically distribute the business's Name, Address, and Phone number (NAP) to 100+ local directories.
- **Key Networks:** This guarantees the business appears perfectly on **Apple Maps Connect**, **Bing Places**, **Yelp**, and in-car navigation systems (like Garmin and Here).

## 2. AI-Powered Local Agents
We configure AI agents (e.g., Local Dominator, TrustHero) to act as a 24/7 digital marketing manager for the local business:
- **Connector Strategy:** We use 3rd party API connectors (e.g., Make.com or direct REST API) to bind the business to these AI tools. We do not host our own AI local agent models.
- **Review Management:** The AI automatically detects and drafts SEO-optimized responses to new Google and Yelp reviews, significantly boosting E-E-A-T signals.
- **Weekly GBP Posts:** The AI automatically generates and publishes weekly updates to the client's Google Business Profile (GBP) to keep the listing "fresh" in Google's eyes.
- **Geo-Grid Tracking:** Instead of just tracking rank for a keyword, we track rank *block-by-block* within a city to visualize the business's actual local dominance.

## 3. Programmatic Local SEO
For clients targeting multiple service areas, we employ Programmatic SEO (pSEO).
- **Static Site Generation (SSG):** To completely eliminate runtime backend costs and ensure perfect Core Web Vitals, we use Next.js `generateStaticParams()`. This fetches the target cities from the `businesses_meta` table at build time and pre-renders the pages statically on Vercel. 
- **Dynamic Content:** We use AI to programmatically generate hyper-local content for these pre-rendered pages. 
- **Example:** If a plumber serves 50 towns around Charlotte, Vercel builds 50 highly optimized, zero-cost static pages like `/plumber-in-huntersville`, `/plumber-in-matthews`, etc.

## 4. Conversational Commerce
Traffic is useless without conversion. We integrate frictionless conversational tools:
- **Apple Business Chat / WhatsApp:** Placing smart widgets on the site so a lead can instantly text the business without filling out a form.
- **AI Voice Receptionists:** Routing inbound calls generated from Google Maps directly to an AI agent (e.g., our ServiceSync AI) to book appointments 24/7.

---
*Note for AI Agent: When scaffolding the "Marketing / Discovery" block for a client, refer to this strategy to ensure multi-platform syndication and programmatic routes are configured.*
