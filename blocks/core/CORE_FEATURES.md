# Core Features

This document defines the **Mandatory Core** that goes into **EVERY SINGLE WEBSITE** we provision at Altay Studio, regardless of the industry (medical, restaurant, contractor, etc.). 

When the AI agent is asked to "create a new website", it must automatically integrate all the features listed below.

## 1. The Admin Dashboard (`/admin`)
Every client needs a way to manage their business. 
- **Route:** Must exist at `/admin`.
- **Authentication:** Must be protected by a simple login screen.
- **Standard Credentials:** 
  - Username: `admin`
  - Password: `admin`
- **Purpose:** To view leads, manage bookings/menus, and see analytics.

## 2. SEO & Discoverability (The SEO Block)
Every site must be perfectly optimized for both humans and AI crawlers from Day 1. This is especially critical for local businesses.
- **Local Business Structured Data (JSON-LD):** Every site must inject standard Schema.org JSON-LD (e.g., `LocalBusiness`, `MedicalClinic`, `Restaurant`) into the `<head>`, mapping out exact business hours, location, contact info, and pricing.
  - *Implementation:* The client's schema MUST include a `businesses_meta` table. The JSON-LD and footer MUST read dynamically from this table, allowing the admin to update hours/location without touching code.
- **`robots.txt` & `sitemap.xml`**: Auto-generated to guide traditional search engines like Google and Bing.
- **`llms.txt`**: A markdown summary of the site at the root for AI crawlers (ChatGPT, Claude, Perplexity) to scrape perfectly.
- **Dynamic Meta & Open Graph Tags**: Unique `title`, `description`, `og:image`, and `twitter:card` tags for every single page to ensure perfect links when shared on social media or iMessage.
- **Canonical URLs**: Every page must have a `<link rel="canonical">` to prevent duplicate content penalties.
- **Semantic HTML & Hierarchy**: Strict use of `<h1>`-`<h6>` (only one `<h1>` per page), `<nav>`, `<article>`, and `<main>`.
- **Core Web Vitals & Accessibility**: Mandatory `alt` text on all images, lazy loading for below-the-fold assets, and fast Largest Contentful Paint (LCP) times.

## 3. Lead Generation (The Lead Gen Block)
Every website's primary goal is to capture revenue.
- **Mechanism:** Must include a high-converting lead capture form, booking widget, or "Get a Quote" mechanism.
- **Storage:** Submissions must sync directly to the client's isolated database schema (`schema_{slug}`) and be visible in their `/admin` dashboard.
  - *Implementation:* Every template's `schema.sql` MUST include a standard `leads` table (e.g., `name`, `email`, `phone`, `source`, `status`, `notes`). This ensures the Admin CRM UI works universally across all templates.

## 4. Footer Branding
- Every site must include a footer that states: **"Designed by Altay Studio"** (with an optional link back to our main agency site). 

## 5. Marketing & Tracking (The Analytics Block)
Every site is an engine for generating revenue. To support this, we run two distinct tracking layers: **Product Analytics** (for our Admin Dashboard) and **Ad Pixels** (for external advertising networks).

**A. Product Analytics (The Admin Engine)**
- **PostHog:** The mandatory telemetry engine. We inject PostHog to capture live session data, page views, and heatmaps. 
  - *Implementation:* We use a **Single Master PostHog Project**. Data isolation is strictly enforced by injecting a `tenant_id` property on every event. The custom React `/admin` dashboard queries the PostHog API filtered by this `tenant_id` so clients only see their own "Active Visitors" and "Referrers".

**B. Ad Network Pixels (The Marketing Engine)**
We must support environment-variable-driven injection of the following pixels so clients can run targeted ad campaigns:
- **Google Ads Conversion Tracking:** To accurately attribute ad spend to generated leads.
- **Meta (Facebook/Instagram) Pixel:** Essential for retargeting and tracking conversions from social ad campaigns.
- **Microsoft Ads (UET) Tag:** To capture search intent on Bing and DuckDuckGo.

---
*Note for AI Agent: Never skip these five core pillars when scaffolding a new bespoke client repository or template.*
