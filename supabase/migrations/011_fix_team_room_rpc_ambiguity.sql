-- RETURNS TABLE creates PL/pgSQL output variables such as `room_id`, `name`,
-- and `status`. Resolve any collision in SQL statements as a table column and
-- target the membership uniqueness constraint directly during upsert.
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

REVOKE ALL ON FUNCTION public.create_team_room(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_team_room_access(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_team_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_team_room_access(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
