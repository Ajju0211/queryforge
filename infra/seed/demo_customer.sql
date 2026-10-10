-- Seed script for Demo Customer Database
-- Used to verify schema introspection and query execution in local development

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    order_status VARCHAR(50) DEFAULT 'completed',
    total_amount_cents INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price_cents INTEGER NOT NULL
);

-- Seed Customers
INSERT INTO customers (name, email, tier, created_at) VALUES
('Acme Corp', 'contact@acme.com', 'enterprise', NOW() - INTERVAL '30 days'),
('Starlight Retail', 'ops@starlight.io', 'growth', NOW() - INTERVAL '20 days'),
('Nexus Logistics', 'support@nexuslogistics.com', 'standard', NOW() - INTERVAL '10 days'),
('DevStudio Labs', 'hello@devstudio.dev', 'standard', NOW() - INTERVAL '5 days')
ON CONFLICT (email) DO NOTHING;

-- Seed Orders
INSERT INTO orders (customer_id, order_status, total_amount_cents, created_at) VALUES
(1, 'completed', 250000, NOW() - INTERVAL '15 days'),
(1, 'completed', 180000, NOW() - INTERVAL '5 days'),
(2, 'completed', 75000, NOW() - INTERVAL '8 days'),
(2, 'pending', 45000, NOW() - INTERVAL '1 day'),
(3, 'completed', 12000, NOW() - INTERVAL '3 days'),
(4, 'completed', 9900, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Seed Order Items
INSERT INTO order_items (order_id, product_name, quantity, unit_price_cents) VALUES
(1, 'Enterprise Cloud License', 1, 200000),
(1, 'Premium Support Addon', 1, 50000),
(2, 'Analytics Seat Pack (10x)', 2, 90000),
(3, 'Base Workspace Subscription', 1, 75000),
(4, 'API Tier Upgrade', 1, 45000),
(5, 'Developer License', 1, 12000),
(6, 'Starter Seat', 1, 9900)
ON CONFLICT DO NOTHING;
