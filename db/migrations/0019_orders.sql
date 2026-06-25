-- 0019: Orders + Order Items for staff order queue
-- Supports: cart → order → staff workflow

CREATE TABLE IF NOT EXISTS orders (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	session_id uuid REFERENCES customer_sessions(id) ON DELETE SET NULL,
	table_id uuid REFERENCES restaurant_tables(id) ON DELETE SET NULL,
	customer_name text,
	status text NOT NULL DEFAULT 'new'
		CHECK (status IN ('new', 'processing', 'ready', 'completed', 'cancelled')),
	total integer NOT NULL DEFAULT 0,
	item_count integer NOT NULL DEFAULT 0,
	notes text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS order_items (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
	name text NOT NULL,
	quantity integer NOT NULL CHECK (quantity > 0),
	price integer NOT NULL CHECK (price >= 0),
	notes text
);

CREATE INDEX idx_orders_restaurant_status
	ON orders (restaurant_id, status, created_at DESC);

CREATE INDEX idx_order_items_order
	ON order_items (order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_org_read ON orders
	FOR SELECT USING (
		auth.uid() IN (
			SELECT m.user_id FROM memberships m
			WHERE m.organization_id = orders.organization_id
		)
	);

CREATE POLICY orders_org_write ON orders
	FOR INSERT WITH CHECK (
		auth.uid() IN (
			SELECT m.user_id FROM memberships m
			WHERE m.organization_id = orders.organization_id
		)
	);

CREATE POLICY orders_org_update ON orders
	FOR UPDATE USING (
		auth.uid() IN (
			SELECT m.user_id FROM memberships m
			WHERE m.organization_id = orders.organization_id
		)
	);

CREATE POLICY order_items_org_read ON order_items
	FOR SELECT USING (
		auth.uid() IN (
			SELECT m.user_id FROM memberships m
			WHERE m.organization_id = order_items.organization_id
		)
	);

CREATE POLICY order_items_org_write ON order_items
	FOR INSERT WITH CHECK (
		auth.uid() IN (
			SELECT m.user_id FROM memberships m
			WHERE m.organization_id = order_items.organization_id
		)
	);
