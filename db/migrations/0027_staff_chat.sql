-- Migration 0027: Staff chat
--
-- Adds fallback_request_id and sender_id to chat_messages so human
-- staff↔buyer messages can be stored alongside existing AI assistant
-- messages (which keep fallback_request_id NULL).
--
-- Transport: SSE over Redis pub/sub (channel: chat:{fallbackRequestId}).
-- Room identity: fallback_request.id — created when buyer taps "Chat with Staff".
--
-- NOTE: fallback_requests.buyer_session_id already exists (migration 0004).
--       No schema changes needed to fallback_requests.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. FK columns on chat_messages
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS fallback_request_id uuid
    REFERENCES public.fallback_requests (id) ON DELETE CASCADE;

-- sender_id: app_user.id for staff messages; NULL for customer/AI messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_id uuid
    REFERENCES public.app_users (id) ON DELETE SET NULL;

-- Index for fast message history lookup per room (most recent first)
CREATE INDEX IF NOT EXISTS chat_messages_room_created_at_idx
  ON public.chat_messages (fallback_request_id, created_at DESC)
  WHERE fallback_request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. RLS policies for staff chat messages
--
-- Existing policies already cover AI chat (session-scoped SELECT/INSERT).
-- We add outlet-scoped policies for staff members and buyer chat participants.
-- ---------------------------------------------------------------------------

-- Staff can SELECT messages in rooms belonging to their outlets
DROP POLICY IF EXISTS chat_messages_staff_chat_select ON public.chat_messages;
CREATE POLICY chat_messages_staff_chat_select ON public.chat_messages
  FOR SELECT USING (
    fallback_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.fallback_requests fr
      WHERE fr.id = fallback_request_id
        AND app.has_organization_access(fr.organization_id)
    )
  );

-- Staff can INSERT 'staff' role messages into their outlet's rooms
DROP POLICY IF EXISTS chat_messages_staff_chat_insert ON public.chat_messages;
CREATE POLICY chat_messages_staff_chat_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    fallback_request_id IS NOT NULL
    AND role = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.fallback_requests fr
      WHERE fr.id = fallback_request_id
        AND app.has_organization_access(fr.organization_id)
    )
  );

-- Buyer can SELECT messages in their own room (scoped by session)
DROP POLICY IF EXISTS chat_messages_buyer_chat_select ON public.chat_messages;
CREATE POLICY chat_messages_buyer_chat_select ON public.chat_messages
  FOR SELECT USING (
    fallback_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.fallback_requests fr
      JOIN   public.buyer_sessions bs ON bs.id = fr.buyer_session_id
      WHERE  fr.id         = fallback_request_id
        AND  bs.public_session_id = app.current_public_session_id()
    )
  );

-- Buyer can INSERT 'customer' role messages into their own room
DROP POLICY IF EXISTS chat_messages_buyer_chat_insert ON public.chat_messages;
CREATE POLICY chat_messages_buyer_chat_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    fallback_request_id IS NOT NULL
    AND role = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.fallback_requests fr
      JOIN   public.buyer_sessions bs ON bs.id = fr.buyer_session_id
      WHERE  fr.id         = fallback_request_id
        AND  bs.public_session_id = app.current_public_session_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. GRANTs — chat_messages already has INSERT + SELECT from migration 0009.
--    New columns inherit table-level grants automatically.
-- ---------------------------------------------------------------------------

COMMIT;
