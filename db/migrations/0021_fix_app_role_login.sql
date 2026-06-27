-- ---------------------------------------------------------------------------
-- Fix ainything_app role — grant LOGIN attribute and set password
-- ---------------------------------------------------------------------------
-- Previous migration 0001 created the role without LOGIN and without a
-- password, making it impossible to open database connections.  Also fixed
-- the GRANT CONNECT target from `postgres` to `ainything`.
-- This migration fixes existing databases that already applied 0001.
-- ---------------------------------------------------------------------------

ALTER ROLE ainything_app WITH LOGIN PASSWORD 'ainything_app';
GRANT CONNECT ON DATABASE ainything TO ainything_app;
