-- Staff invites table for tracking pending team member invitations
-- Stores email, role, and expiry. Invitation is single-use and expires after 7 days.

CREATE TABLE IF NOT EXISTS invites (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	email text NOT NULL,
	role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
	invited_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	token text NOT NULL UNIQUE,
	expires_at timestamptz NOT NULL,
	accepted_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS invites_organization_id_idx ON invites(organization_id);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites(email);
CREATE INDEX IF NOT EXISTS invites_token_idx ON invites(token) WHERE accepted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON invites TO lingua_app;

COMMENT ON TABLE invites IS 'Pending staff invitations with expiry tracking';
COMMENT ON COLUMN invites.token IS 'Unique token for accepting the invitation via email link';
COMMENT ON COLUMN invites.accepted_at IS 'Timestamp when the invite was accepted, NULL if pending';
