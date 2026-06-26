-- Migration 0004: Operational tables
--
-- Guest interaction tables: buyer sessions, chat, fallback requests,
-- feedback, AI events, and knowledge documents.
-- Generic naming — zero food-specific terms.

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: buyer_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyer_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id         uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  table_id          uuid        REFERENCES public.outlet_tables (id) ON DELETE SET NULL,
  public_session_id uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  language_tag      text        NOT NULL DEFAULT 'id',
  metadata          jsonb       NOT NULL DEFAULT '{}',
  last_active_at    timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: has_outlet_access
-- Defined here (not in 0003) because it references buyer_sessions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.has_outlet_access(p_outlet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT
    app.has_organization_access((
      SELECT organization_id FROM public.outlets WHERE id = p_outlet_id
    ))
    OR EXISTS (
      SELECT 1
      FROM   public.buyer_sessions bs
      WHERE  bs.outlet_id         = p_outlet_id
      AND    bs.public_session_id = app.current_public_session_id()
    );
$$;

GRANT EXECUTE ON FUNCTION app.has_outlet_access(uuid) TO ainything_app;

-- ---------------------------------------------------------------------------
-- Table: chat_messages
-- Append-only: no UPDATE or DELETE granted to ainything_app.
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.buyer_sessions IS 'Tracks active buyer/guest sessions per outlet table.';

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id         uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  buyer_session_id  uuid        REFERENCES public.buyer_sessions (id) ON DELETE CASCADE,
  role              text        NOT NULL
                                CHECK (role IN ('customer','assistant','staff','system')),
  content           text        NOT NULL,
  safety_status     text        NOT NULL DEFAULT 'ok'
                                CHECK (safety_status IN ('ok','low-confidence','needs-staff','blocked')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_messages IS 'Append-only chat message log. Do not UPDATE or DELETE rows.';

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: fallback_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fallback_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id         uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  buyer_session_id  uuid        REFERENCES public.buyer_sessions (id) ON DELETE SET NULL,
  table_id          uuid        REFERENCES public.outlet_tables (id) ON DELETE SET NULL,
  language_tag      text        NOT NULL DEFAULT 'id',
  status            text        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','in-progress','resolved')),
  priority          text        NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('normal','high')),
  guest_need        text        NOT NULL,
  summary           text        NOT NULL DEFAULT '',
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_fallback_requests_updated_at ON public.fallback_requests;
CREATE TRIGGER set_fallback_requests_updated_at
  BEFORE UPDATE ON public.fallback_requests
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.fallback_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id        uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  buyer_session_id uuid        REFERENCES public.buyer_sessions (id) ON DELETE SET NULL,
  chat_message_id  uuid        REFERENCES public.chat_messages (id) ON DELETE SET NULL,
  helpful          boolean,
  issue_type       text        CHECK (issue_type IN (
                                 'wrong-info','missing-info','too-slow','language-problem','other'
                               )),
  comment          text,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: ai_events
-- Append-only: usage/cost/safety event log per AI call.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_events (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid           NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id         uuid           NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  buyer_session_id  uuid           REFERENCES public.buyer_sessions (id) ON DELETE SET NULL,
  model             text           NOT NULL,
  prompt_tokens     int            NOT NULL DEFAULT 0,
  completion_tokens int            NOT NULL DEFAULT 0,
  latency_ms        int            NOT NULL DEFAULT 0,
  cost_usd          numeric(10,6)  NOT NULL DEFAULT 0,
  safety_status     text           CHECK (safety_status IN ('ok','low-confidence','needs-staff','blocked')),
  retrieval_source  text,
  confidence        numeric(3,2),
  created_at        timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_events IS 'Append-only AI call log. Do not UPDATE or DELETE rows.';

ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Table: knowledge_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  outlet_id       uuid        NOT NULL REFERENCES public.outlets (id) ON DELETE CASCADE,
  title           text        NOT NULL,
  content         text        NOT NULL,
  source_type     text        CHECK (source_type IN ('manual','pdf-upload','web-scrape','spreadsheet')),
  visibility      text        NOT NULL DEFAULT 'public'
                              CHECK (visibility IN ('public','staff-only','archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_knowledge_documents_updated_at ON public.knowledge_documents;
CREATE TRIGGER set_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies: buyer_sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS buyer_sessions_tenant_select    ON public.buyer_sessions;
DROP POLICY IF EXISTS buyer_sessions_tenant_update    ON public.buyer_sessions;
DROP POLICY IF EXISTS buyer_sessions_public_insert    ON public.buyer_sessions;
DROP POLICY IF EXISTS buyer_sessions_own_update       ON public.buyer_sessions;
DROP POLICY IF EXISTS buyer_sessions_platform_select  ON public.buyer_sessions;

CREATE POLICY buyer_sessions_tenant_select ON public.buyer_sessions
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY buyer_sessions_public_insert ON public.buyer_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY buyer_sessions_own_update ON public.buyer_sessions
  FOR UPDATE USING (public_session_id = app.current_public_session_id());

CREATE POLICY buyer_sessions_platform_select ON public.buyer_sessions
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: chat_messages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS chat_messages_tenant_select    ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_session_insert   ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_platform_select  ON public.chat_messages;

CREATE POLICY chat_messages_tenant_select ON public.chat_messages
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY chat_messages_session_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buyer_sessions bs
      WHERE bs.id                = buyer_session_id
      AND   bs.public_session_id = app.current_public_session_id()
    )
  );

CREATE POLICY chat_messages_platform_select ON public.chat_messages
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: fallback_requests
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS fallback_requests_tenant_select    ON public.fallback_requests;
DROP POLICY IF EXISTS fallback_requests_tenant_update    ON public.fallback_requests;
DROP POLICY IF EXISTS fallback_requests_session_insert   ON public.fallback_requests;
DROP POLICY IF EXISTS fallback_requests_platform_select  ON public.fallback_requests;

CREATE POLICY fallback_requests_tenant_select ON public.fallback_requests
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY fallback_requests_tenant_update ON public.fallback_requests
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY fallback_requests_session_insert ON public.fallback_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buyer_sessions bs
      WHERE bs.id                = buyer_session_id
      AND   bs.public_session_id = app.current_public_session_id()
    )
  );

CREATE POLICY fallback_requests_platform_select ON public.fallback_requests
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: feedback
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS feedback_tenant_select    ON public.feedback;
DROP POLICY IF EXISTS feedback_session_insert   ON public.feedback;
DROP POLICY IF EXISTS feedback_platform_select  ON public.feedback;

CREATE POLICY feedback_tenant_select ON public.feedback
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY feedback_session_insert ON public.feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buyer_sessions bs
      WHERE bs.id                = buyer_session_id
      AND   bs.public_session_id = app.current_public_session_id()
    )
  );

CREATE POLICY feedback_platform_select ON public.feedback
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: ai_events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ai_events_tenant_select    ON public.ai_events;
DROP POLICY IF EXISTS ai_events_session_insert   ON public.ai_events;
DROP POLICY IF EXISTS ai_events_platform_select  ON public.ai_events;

CREATE POLICY ai_events_tenant_select ON public.ai_events
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY ai_events_session_insert ON public.ai_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buyer_sessions bs
      WHERE bs.id                = buyer_session_id
      AND   bs.public_session_id = app.current_public_session_id()
    )
  );

CREATE POLICY ai_events_platform_select ON public.ai_events
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- RLS policies: knowledge_documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS knowledge_documents_tenant_select    ON public.knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_tenant_insert    ON public.knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_tenant_update    ON public.knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_tenant_delete    ON public.knowledge_documents;
DROP POLICY IF EXISTS knowledge_documents_platform_select  ON public.knowledge_documents;

CREATE POLICY knowledge_documents_tenant_select ON public.knowledge_documents
  FOR SELECT USING (app.has_organization_access(organization_id));

CREATE POLICY knowledge_documents_tenant_insert ON public.knowledge_documents
  FOR INSERT WITH CHECK (app.has_organization_access(organization_id));

CREATE POLICY knowledge_documents_tenant_update ON public.knowledge_documents
  FOR UPDATE USING (app.has_organization_access(organization_id));

CREATE POLICY knowledge_documents_tenant_delete ON public.knowledge_documents
  FOR DELETE USING (app.has_organization_access(organization_id));

CREATE POLICY knowledge_documents_platform_select ON public.knowledge_documents
  FOR SELECT USING (app.has_platform_access());

-- ---------------------------------------------------------------------------
-- GRANTs
-- Append-only tables (chat_messages, ai_events) get INSERT + SELECT only.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE        ON public.buyer_sessions      TO ainything_app;
GRANT SELECT, INSERT                ON public.chat_messages       TO ainything_app;
GRANT SELECT, INSERT, UPDATE        ON public.fallback_requests   TO ainything_app;
GRANT SELECT, INSERT                ON public.feedback            TO ainything_app;
GRANT SELECT, INSERT                ON public.ai_events           TO ainything_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO ainything_app;

COMMIT;
