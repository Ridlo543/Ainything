-- Migration 0002: Auth bridge
--
-- Part A: Local dev stub — creates auth schema + users table if auth does not
--         exist yet (skipped automatically on Supabase where auth.* is built-in).
-- Part B: Auth bridge triggers — inserts into app_users on new auth signup and
--         keeps email in sync. Guarded by a runtime check so it is safe to run
--         on both Supabase and local PostgreSQL.

BEGIN;

-- ---------------------------------------------------------------------------
-- Part A: Local dev stub
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth TO PUBLIC;

    CREATE TABLE auth.users (
      id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      email              text,
      raw_user_meta_data jsonb       NOT NULL DEFAULT '{}'::jsonb,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now()
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

-- ---------------------------------------------------------------------------
-- Part B: Supabase auth bridge (conditional on auth.users existing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN

    -- Trigger: new auth user → create app_users row
    CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      INSERT INTO public.app_users (external_auth_id, email, name, platform_role)
      VALUES (
        NEW.id::text,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        'staff'
      )
      ON CONFLICT (external_auth_id) DO NOTHING;

      RETURN NEW;
    END;
    $fn$;

    REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_auth_user();

    -- Trigger: auth email update → sync to app_users
    CREATE OR REPLACE FUNCTION public.handle_auth_email_update()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE public.app_users
        SET    email = NEW.email
        WHERE  external_auth_id = NEW.id::text;
      END IF;

      RETURN NEW;
    END;
    $fn$;

    REVOKE EXECUTE ON FUNCTION public.handle_auth_email_update() FROM PUBLIC;

    DROP TRIGGER IF EXISTS on_auth_email_updated ON auth.users;
    CREATE TRIGGER on_auth_email_updated
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_auth_email_update();

  END IF;
END
$$;

COMMIT;
