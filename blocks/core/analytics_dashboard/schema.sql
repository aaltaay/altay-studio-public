-- Views are typically used here, not raw tables.
CREATE VIEW monthly_revenue AS SELECT date_trunc('month', created_at) as month, sum(amount) from invoices group by 1;\n