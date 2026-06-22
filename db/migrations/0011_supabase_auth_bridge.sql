-- Migration 0011: Supabase Auth -> app_users bridge
--
-- When a new user signs up via Supabase Auth, automatically create a
-- corresponding row in app_users. This ensures the auth provider can
-- immediately resolve platform_role and memberships without requiring
-- a separate registration step in the app database.
--
-- The trigger runs as SECURITY DEFINER on auth.users AFTER INSERT.
-- It is idempotent: if the row already exists (e.g., seeded manually),
-- it does nothing.
--
-- LOCAL DEV: migration 0011-local creates a stub auth schema + users table.
-- This migration is guarded so it only creates triggers when auth.users
-- exists (Supabase or local stub).

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN

		CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
		RETURNS trigger
		LANGUAGE plpgsql
		SECURITY DEFINER
		SET search_path = public
		AS $fn$
		BEGIN
			INSERT INTO app_users (external_auth_id, email, name, platform_role)
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

		CREATE OR REPLACE FUNCTION public.handle_auth_email_update()
		RETURNS trigger
		LANGUAGE plpgsql
		SECURITY DEFINER
		SET search_path = public
		AS $fn$
		BEGIN
			IF OLD.email IS DISTINCT FROM NEW.email THEN
				UPDATE app_users
				SET email = NEW.email
				WHERE external_auth_id = NEW.id::text;
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
