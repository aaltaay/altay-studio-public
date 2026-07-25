// Altay Studio — Centralized Constants
// All tunables live here.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://[YOUR_SUPABASE_PROJECT_REF].supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "[JWT_TOKEN]";

export const DOMAIN = "altaystudio.com";

export const BUSINESS_TYPES = [
  { value: "barber", label: "Barber Shop" },
  { value: "clinic", label: "Clinic" },
  { value: "restaurant", label: "Restaurant" },
  { value: "bespoke", label: "Bespoke (Custom)" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export const PROVISION_STEPS = [
  { key: "create_business", label: "Setting up your account..." },
  { key: "generate_from_template", label: "Creating your site..." },
  { key: "set_repo_variables", label: "Configuring your site..." },
  { key: "create_vercel_deployment", label: "Deploying your site..." },
  { key: "create_subdomain", label: "Configuring your domain..." },
  { key: "update_business", label: "Finalizing setup..." },
  { key: "send_welcome_email", label: "Sending welcome email..." },
] as const;

export const SLUG_REGEX = /^[a-z0-9-]+$/;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 32;

/** Maps business types to GitHub template repos (env overrides at provision time). */
export const TEMPLATE_MAP: Record<
  BusinessType,
  { templateRepo: string; framework: "vite" | "nextjs" }
> = {
  barber: { templateRepo: "template-barber", framework: "nextjs" },
  clinic: { templateRepo: "template-clinic", framework: "vite" },
  restaurant: { templateRepo: "template-restaurant", framework: "vite" },
  bespoke: { templateRepo: "template-bespoke", framework: "vite" },
};

/** Feature toggles exposed on the signup form per business type. */
export const FEATURE_REGISTRY: Record<
  BusinessType,
  Record<string, { enabled: boolean; required?: boolean }>
> = {
  barber: {
    booking_calendar: { enabled: true, required: true },
    gallery: { enabled: true },
    staff_profiles: { enabled: true },
    contact_form: { enabled: true, required: true },
  },
  clinic: {
    booking_calendar: { enabled: true, required: true },
    staff_profiles: { enabled: true },
    contact_form: { enabled: true, required: true },
  },
  restaurant: {
    gallery: { enabled: true },
    contact_form: { enabled: true, required: true },
    reviews: { enabled: true },
  },
  bespoke: {
    gallery: { enabled: true },
    contact_form: { enabled: true, required: true },
  },
};

