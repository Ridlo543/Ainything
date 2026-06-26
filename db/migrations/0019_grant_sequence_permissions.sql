-- Migration 0019: Grant sequence permissions to ainything_app
--
-- Problem: Migration 0016 added order_number SERIAL to orders, which creates
-- orders_order_number_seq owned by the migration superuser. The app role
-- ainything_app was never granted USAGE on this sequence, causing every
-- INSERT INTO orders to fail with:
--   ERROR: permission denied for sequence orders_order_number_seq
--
-- Fix: Grant USAGE and SELECT on the sequence so ainything_app can advance it.

GRANT USAGE, SELECT ON SEQUENCE orders_order_number_seq TO ainything_app;
