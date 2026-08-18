-- Real Team Hub rooms with owner-approved membership.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.team_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_room_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_room_state (
  room_id uuid PRIMARY KEY REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON public.team_room_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_team_memberships_room ON public.team_room_memberships(room_id, status);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_room_state') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_room_state;
  END IF;
END $$;

ALTER TABLE public.team_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_room_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_room_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_approved_room_member(target_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_room_memberships
    WHERE room_id = target_room AND user_id = auth.uid() AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(target_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_room_memberships
    WHERE room_id = target_room AND user_id = auth.uid()
      AND status = 'approved' AND role IN ('owner', 'admin')
  );
$$;

DROP POLICY IF EXISTS "room_members_can_read" ON public.team_rooms;
CREATE POLICY "room_members_can_read" ON public.team_rooms FOR SELECT
  USING (public.is_approved_room_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "room_admins_can_update" ON public.team_rooms;
CREATE POLICY "room_admins_can_update" ON public.team_rooms FOR UPDATE
  USING (public.is_room_admin(id)) WITH CHECK (public.is_room_admin(id));

DROP POLICY IF EXISTS "memberships_visible_to_self_or_admin" ON public.team_room_memberships;
CREATE POLICY "memberships_visible_to_self_or_admin" ON public.team_room_memberships FOR SELECT
  USING (user_id = auth.uid() OR public.is_room_admin(room_id));

DROP POLICY IF EXISTS "approved_members_read_room_state" ON public.team_room_state;
CREATE POLICY "approved_members_read_room_state" ON public.team_room_state FOR SELECT
  USING (public.is_approved_room_member(room_id));
DROP POLICY IF EXISTS "approved_members_insert_room_state" ON public.team_room_state;
CREATE POLICY "approved_members_insert_room_state" ON public.team_room_state FOR INSERT
  WITH CHECK (public.is_approved_room_member(room_id) AND updated_by = auth.uid());
DROP POLICY IF EXISTS "approved_members_update_room_state" ON public.team_room_state;
CREATE POLICY "approved_members_update_room_state" ON public.team_room_state FOR UPDATE
  USING (public.is_approved_room_member(room_id))
  WITH CHECK (public.is_approved_room_member(room_id) AND updated_by = auth.uid());

-- All mutations use narrow SECURITY DEFINER RPCs, avoiding client-side privilege escalation.
CREATE OR REPLACE FUNCTION public.create_team_room(room_name text)
RETURNS TABLE (room_id uuid, name text, invite_code text, membership_id uuid, role text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  new_room public.team_rooms;
  new_membership public.team_room_memberships;
  generated_code text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(room_name)) < 2 THEN RAISE EXCEPTION 'Room name is too short'; END IF;

  LOOP
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4) || '-' || substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.team_rooms r WHERE r.invite_code = generated_code);
  END LOOP;

  INSERT INTO public.team_rooms (name, invite_code, created_by)
  VALUES (trim(room_name), generated_code, auth.uid()) RETURNING * INTO new_room;

  INSERT INTO public.team_room_memberships (room_id, user_id, role, status, reviewed_at, reviewed_by)
  VALUES (new_room.id, auth.uid(), 'owner', 'approved', now(), auth.uid()) RETURNING * INTO new_membership;

  INSERT INTO public.team_room_state (room_id, data, updated_by)
  VALUES (new_room.id, '{}'::jsonb, auth.uid());

  RETURN QUERY SELECT new_room.id, new_room.name, new_room.invite_code,
    new_membership.id, new_membership.role, new_membership.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_team_room_access(code text)
RETURNS TABLE (room_id uuid, name text, membership_id uuid, role text, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE target_room public.team_rooms; membership public.team_room_memberships;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO target_room FROM public.team_rooms r WHERE r.invite_code = upper(trim(code));
  IF target_room.id IS NULL THEN RAISE EXCEPTION 'Room code not found'; END IF;

  INSERT INTO public.team_room_memberships (room_id, user_id, role, status, requested_at, reviewed_at, reviewed_by)
  VALUES (target_room.id, auth.uid(), 'member', 'pending', now(), NULL, NULL)
  ON CONFLICT ON CONSTRAINT team_room_memberships_room_id_user_id_key DO UPDATE SET
    status = CASE WHEN team_room_memberships.status = 'approved' THEN 'approved' ELSE 'pending' END,
    requested_at = CASE WHEN team_room_memberships.status = 'approved' THEN team_room_memberships.requested_at ELSE now() END,
    reviewed_at = CASE WHEN team_room_memberships.status = 'approved' THEN team_room_memberships.reviewed_at ELSE NULL END,
    reviewed_by = CASE WHEN team_room_memberships.status = 'approved' THEN team_room_memberships.reviewed_by ELSE NULL END
  RETURNING * INTO membership;

  RETURN QUERY SELECT target_room.id, target_room.name, membership.id, membership.role, membership.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_team_rooms()
RETURNS TABLE (room_id uuid, name text, invite_code text, membership_id uuid, role text, status text, pending_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name,
    CASE WHEN m.role IN ('owner', 'admin') AND m.status = 'approved' THEN r.invite_code ELSE NULL END,
    m.id, m.role, m.status,
    CASE WHEN m.role IN ('owner', 'admin') AND m.status = 'approved'
      THEN (SELECT count(*) FROM public.team_room_memberships p WHERE p.room_id = r.id AND p.status = 'pending')
      ELSE 0 END
  FROM public.team_room_memberships m
  JOIN public.team_rooms r ON r.id = m.room_id
  WHERE m.user_id = auth.uid()
  ORDER BY m.requested_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_team_room_members(target_room uuid)
RETURNS TABLE (membership_id uuid, user_id uuid, display_name text, email text, role text, status text, requested_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_admin(target_room) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN QUERY
    SELECT m.id, m.user_id,
      COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      u.email::text, m.role, m.status, m.requested_at
    FROM public.team_room_memberships m JOIN auth.users u ON u.id = m.user_id
    WHERE m.room_id = target_room ORDER BY m.status = 'pending' DESC, m.requested_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_team_room_member(target_membership uuid, decision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE membership public.team_room_memberships;
BEGIN
  SELECT * INTO membership FROM public.team_room_memberships WHERE id = target_membership;
  IF membership.id IS NULL OR NOT public.is_room_admin(membership.room_id) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF membership.role = 'owner' THEN RAISE EXCEPTION 'The room owner cannot be reviewed'; END IF;
  IF decision NOT IN ('approved', 'rejected', 'revoked') THEN RAISE EXCEPTION 'Invalid membership decision'; END IF;
  UPDATE public.team_room_memberships SET status = decision, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = target_membership;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_team_room_code(target_room uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE generated_code text;
BEGIN
  IF NOT public.is_room_admin(target_room) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  LOOP
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4) || '-' || substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.team_rooms WHERE invite_code = generated_code);
  END LOOP;
  UPDATE public.team_rooms SET invite_code = generated_code, updated_at = now() WHERE id = target_room;
  RETURN generated_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_room(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_team_room_access(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_my_team_rooms() FROM public, anon;
REVOKE ALL ON FUNCTION public.get_team_room_members(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.review_team_room_member(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.regenerate_team_room_code(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_team_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_team_room_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_room_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_team_room_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_team_room_code(uuid) TO authenticated;

-- Make newly created tables and RPCs immediately visible to the REST API.
NOTIFY pgrst, 'reload schema';
