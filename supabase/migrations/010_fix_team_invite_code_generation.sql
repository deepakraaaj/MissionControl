-- Supabase installs pgcrypto in the `extensions` schema. The room RPCs use a
-- restricted `search_path = public`, so pgcrypto functions must be qualified.
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
REVOKE ALL ON FUNCTION public.regenerate_team_room_code(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_team_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_team_room_code(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
