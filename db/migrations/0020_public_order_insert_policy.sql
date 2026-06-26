-- Migration 0020: Public INSERT policies for orders and order_items
--
-- Problem: Migration 0007 only added orders_tenant_insert (checks
-- has_organization_access), which requires app.user_external_id to be set
-- (authenticated staff/owner). Public buyers submit orders via the cart form
-- action, which runs under ainything_app with no user context. This caused
-- every public order submission to fail with:
--   ERROR: new row violates row-level security policy for table "orders"
--
-- Fix: Add a helper function app.is_public_outlet(outlet_id) that returns
-- true when the outlet exists and is active/open — no session or auth needed.
-- Then add INSERT policies on orders and order_items that use this check.
-- This matches the product design: the cart is accessible without QR sessions.

BEGIN;

-- Helper: returns true when the outlet exists and status is not 'inactive'
CREATE OR REPLACE FUNCTION app.is_public_outlet(p_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.outlets
    WHERE  id     = p_outlet_id
    AND    status <> 'inactive'
  );
$$;

GRANT EXECUTE ON FUNCTION app.is_public_outlet(uuid) TO ainything_app;

-- Drop any previously attempted policies from this migration
DROP POLICY IF EXISTS orders_outlet_insert      ON public.orders;
DROP POLICY IF EXISTS order_items_outlet_insert  ON public.order_items;

-- Public buyers can insert orders for any active outlet
CREATE POLICY orders_outlet_insert ON public.orders
  FOR INSERT WITH CHECK (app.is_public_outlet(outlet_id));

-- Public buyers can insert order_items for any active outlet
CREATE POLICY order_items_outlet_insert ON public.order_items
  FOR INSERT WITH CHECK (app.is_public_outlet(outlet_id));

COMMIT;
