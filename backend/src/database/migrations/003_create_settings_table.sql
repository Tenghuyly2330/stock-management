-- Create system_settings table to persist company and business configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(255) NOT NULL DEFAULT 'StockSync Farm Machinery & Industrial Metals',
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
  support_email VARCHAR(255) DEFAULT 'support@stocksync.com',
  support_phone VARCHAR(50) DEFAULT '+1-800-555-BASE',
  reorder_alert_threshold INT DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id, company_name, currency_symbol, support_email, support_phone, reorder_alert_threshold)
VALUES (1, 'StockSync Farm Machinery & Industrial Metals', '$', 'support@stocksync.com', '+1-800-555-BASE', 5)
ON CONFLICT (id) DO NOTHING;
