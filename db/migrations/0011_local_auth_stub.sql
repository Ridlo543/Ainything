-- Migration 0011-local: Auth schema stub for local PostgreSQL testing
--
-- Supabase provides auth.users automatically, but local PostgreSQL does not.
-- This migration creates a minimal auth schema + users table so migration 0011
-- (supabase_auth_bridge) and seed data can run locally.
-- Supabase environments skip this file because auth.* already exists.

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
		CREATE SCHEMA auth;
		GRANT USAGE ON SCHEMA auth TO lingua_app, lingua;

		CREATE TABLE auth.users (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			email text,
			raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		);

		ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

		CREATE OR REPLACE FUNCTION auth.uid()
		RETURNS uuid
		LANGUAGE sql
		STABLE
		AS $auth_uid_fn$ SELECT NULL::uuid; $auth_uid_fn$;
	END IF;
END
$$;
