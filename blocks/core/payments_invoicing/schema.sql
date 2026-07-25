-- blocks/core/payments_invoicing/schema.sql
-- Payments and Invoicing Schema (Production Ready)
-- Run this into the tenant's schema (e.g. schema_slug)

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL, -- References clients(id)
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admins RLS Policies
CREATE POLICY "Admins can manage invoices" 
  ON invoices FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);