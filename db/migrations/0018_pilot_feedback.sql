-- =============================================================================
-- Migration 0018: Pilot feedback
-- Stores structured feedback from restaurant owners during the pilot.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pilot_feedback (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	submitted_by_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE SET NULL,
	-- Rating: 1–5 overall experience
	overall_rating smallint NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
	-- Structured fields
	ai_accuracy text CHECK (ai_accuracy IN ('excellent','good','acceptable','poor')),
	setup_difficulty text CHECK (setup_difficulty IN ('very-easy','easy','neutral','hard','very-hard')),
	would_recommend boolean,
	-- Free text
	comment text,
	-- Pilot meta
	phase text NOT NULL DEFAULT 'alpha',
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pilot_feedback_org_idx ON pilot_feedback (organization_id);
CREATE INDEX IF NOT EXISTS pilot_feedback_created_idx ON pilot_feedback (created_at DESC);

-- RLS
ALTER TABLE pilot_feedback ENABLE ROW LEVEL SECURITY;

-- Org members can INSERT their own feedback
CREATE POLICY pilot_feedback_insert
	ON pilot_feedback FOR INSERT
	TO lingua_app
	WITH CHECK (app.has_organization_access(organization_id));

-- Org members can SELECT their own org's feedback
CREATE POLICY pilot_feedback_select
	ON pilot_feedback FOR SELECT
	TO lingua_app
	USING (app.has_organization_access(organization_id));

-- Platform admin (super_admin) reads all via getPool() — no RLS needed for that path.

GRANT INSERT, SELECT ON pilot_feedback TO lingua_app;

COMMENT ON TABLE pilot_feedback IS
	'Structured feedback from restaurant owners during the alpha/beta pilot.';
