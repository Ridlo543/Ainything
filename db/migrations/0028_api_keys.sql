-- Migration 0028: API Keys
--
-- Creates the api_keys table for platform-level API key management.
-- Keys are stored as SHA-256 hashes — the raw key is never persisted.
-- Only super_admin can manage keys (enforced by both RLS and app layer).

BEGIN;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  key_prefix    TEXT        NOT NULL,                          -- first 16 chars of raw key (display only)
  key_hash      TEXT        NOT NULL UNIQUE,                  -- SHA-256(raw_key) hex, for lookup
  created_by    UUID        NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,                                   -- NULL = never expires
  revoked_at    TIMESTAMPTZ,                                   -- NULL = active
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.api_keys IS
  'Platform API keys. key_hash is SHA-256 of the raw key — raw key is never stored. '
  'Only super_admin may read or write this table.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Fast lookup by hash on every incoming request
CREATE INDEX api_keys_key_hash_idx ON public.api_keys (key_hash);
-- Filter active/revoked keys quickly
CREATE INDEX api_keys_revoked_at_idx ON public.api_keys (revoked_at) WHERE revoked_at IS NULL;
-- Order by creation date for list view
CREATE INDEX api_keys_created_at_idx ON public.api_keys (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- super_admin can select all keys
DROP POLICY IF EXISTS api_keys_platform_select ON public.api_keys;
CREATE POLICY api_keys_platform_select ON public.api_keys
  FOR SELECT USING (app.has_platform_access());

-- super_admin can insert new keys
DROP POLICY IF EXISTS api_keys_platform_insert ON public.api_keys;
CREATE POLICY api_keys_platform_insert ON public.api_keys
  FOR INSERT WITH CHECK (app.has_platform_access());

-- super_admin can update (revoke = set revoked_at; update last_used_at)
-- Explicitly disallow updating key_hash or key_prefix once set
DROP POLICY IF EXISTS api_keys_platform_update ON public.api_keys;
CREATE POLICY api_keys_platform_update ON public.api_keys
  FOR UPDATE USING (app.has_platform_access());

-- No DELETE — keys are soft-deleted via revoked_at for audit trail
REVOKE DELETE ON public.api_keys FROM ainything_app;

-- ---------------------------------------------------------------------------
-- Column-level protection: key_hash must never be changed after insert
-- ---------------------------------------------------------------------------
REVOKE UPDATE (key_hash, key_prefix, created_by, created_at) ON public.api_keys FROM ainything_app;

COMMIT;
