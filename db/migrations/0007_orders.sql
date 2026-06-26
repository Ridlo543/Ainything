-- Migration 0007: Orders
--
-- Generic order and order_items tables. No restaurant/menu terminology.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id        uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  buyer_session_id uuid        REFERENCES public.buyer_sessions (id) ON DELETE SET NULL,
  table_id         uuid        REFERENCES public.outlet_tables (id) ON DELETE SET NULL,
  customer_name    text,
  status           text        NOT NULL DEFAULT 'new'
                               CHECK (status IN ('new','processing','ready','completed','cancelled')),
  total            int         NOT NULL DEFAULT 0,
  item_count       int         NOT NULL DEFAULT 0,
  notes            text,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid    NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  organization_id uuid    NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid    NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  product_id      uuid    REFERENCES public.products (id) ON DELETE SET NULL,
  name            text    NOT NULL,
  quantity        int     NOT NULL CHECK (quantity > 0),
  price           int     NOT NULL CHECK (price >= 0),
  notes           text
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS orders_outlet_status_idx
  ON public.orders (outlet_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- RLS policies: orders
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS orders_tenant_select    ON public.orders;
DROP POLICY IF EXISTS orders_tenant_insert    ON public.orders;
DROP POLICY IF EXISTS orders_tenant_update    ON public.orders;
DROP POLICY IF EXISTS orders_outlet_select    ON public.orders;
DROP POLICY IF EXISTS orders_platform_select  ON public.orders;

CREATE POLICY orders_tenant_select ON public.orders
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY orders_tenant_insert ON public.orders
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY orders_tenant_update ON public.orders
  FOR UPDATE USING (app.has_organization_access(organization_id));

-- Buyers can see their own session's orders
CREATE POLICY orders_outlet_select ON public.orders
  FOR SELECT USING (app.has_outlet_access(outlet_id));

CREATE POLICY orders_platform_select ON public.orders
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: order_items
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS order_items_tenant_select    ON public.order_items;
DROP POLICY IF EXISTS order_items_tenant_insert    ON public.order_items;
DROP POLICY IF EXISTS order_items_outlet_select    ON public.order_items;
DROP POLICY IF EXISTS order_items_platform_select  ON public.order_items;

CREATE POLICY order_items_tenant_select ON public.order_items
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY order_items_tenant_insert ON public.order_items
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY order_items_outlet_select ON public.order_items
  FOR SELECT USING (app.has_outlet_access(outlet_id));

CREATE POLICY order_items_platform_select ON public.order_items
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.orders      TO ainything_app;
GRANT SELECT, INSERT         ON public.order_items TO ainything_app;

COMMIT;
