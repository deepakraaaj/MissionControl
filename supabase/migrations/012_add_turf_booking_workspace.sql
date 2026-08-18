-- TurfSlot Arena: shared booking, availability, roster and score data per team room.
CREATE TABLE IF NOT EXISTS public.turf_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  name text NOT NULL, description text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id, name)
);
CREATE TABLE IF NOT EXISTS public.turf_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.turf_projects(id) ON DELETE CASCADE,
  name text NOT NULL, location text NOT NULL DEFAULT '', sport text NOT NULL DEFAULT 'Football', capacity integer NOT NULL DEFAULT 10 CHECK (capacity > 0), active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.turf_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), venue_id uuid NOT NULL REFERENCES public.turf_venues(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, price_paise integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','held','booked','cancelled')), UNIQUE(venue_id, starts_at)
);
CREATE TABLE IF NOT EXISTS public.turf_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slot_id uuid NOT NULL REFERENCES public.turf_slots(id) ON DELETE CASCADE,
  booked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, team_name text NOT NULL DEFAULT '', player_count integer NOT NULL DEFAULT 1 CHECK (player_count > 0), status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.turf_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.turf_projects(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.turf_slots(id) ON DELETE SET NULL, title text NOT NULL, team_a text NOT NULL DEFAULT 'Team A', team_b text NOT NULL DEFAULT 'Team B', score_a integer NOT NULL DEFAULT 0, score_b integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed')), created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.turf_projects ENABLE ROW LEVEL SECURITY; ALTER TABLE public.turf_venues ENABLE ROW LEVEL SECURITY; ALTER TABLE public.turf_slots ENABLE ROW LEVEL SECURITY; ALTER TABLE public.turf_bookings ENABLE ROW LEVEL SECURITY; ALTER TABLE public.turf_matches ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.is_turf_room_member(target_room uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_approved_room_member(target_room) $$;
CREATE POLICY "approved members can use turf projects" ON public.turf_projects FOR ALL USING (public.is_turf_room_member(room_id)) WITH CHECK (public.is_turf_room_member(room_id));
CREATE POLICY "approved members can use turf venues" ON public.turf_venues FOR ALL USING (EXISTS (SELECT 1 FROM public.turf_projects p WHERE p.id=project_id AND public.is_turf_room_member(p.room_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.turf_projects p WHERE p.id=project_id AND public.is_turf_room_member(p.room_id)));
CREATE POLICY "approved members can use turf slots" ON public.turf_slots FOR ALL USING (EXISTS (SELECT 1 FROM public.turf_venues v JOIN public.turf_projects p ON p.id=v.project_id WHERE v.id=venue_id AND public.is_turf_room_member(p.room_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.turf_venues v JOIN public.turf_projects p ON p.id=v.project_id WHERE v.id=venue_id AND public.is_turf_room_member(p.room_id)));
CREATE POLICY "approved members can use turf bookings" ON public.turf_bookings FOR ALL USING (EXISTS (SELECT 1 FROM public.turf_slots s JOIN public.turf_venues v ON v.id=s.venue_id JOIN public.turf_projects p ON p.id=v.project_id WHERE s.id=slot_id AND public.is_turf_room_member(p.room_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.turf_slots s JOIN public.turf_venues v ON v.id=s.venue_id JOIN public.turf_projects p ON p.id=v.project_id WHERE s.id=slot_id AND public.is_turf_room_member(p.room_id)) AND booked_by=auth.uid());
CREATE POLICY "approved members can use turf matches" ON public.turf_matches FOR ALL USING (EXISTS (SELECT 1 FROM public.turf_projects p WHERE p.id=project_id AND public.is_turf_room_member(p.room_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.turf_projects p WHERE p.id=project_id AND public.is_turf_room_member(p.room_id)) AND created_by=auth.uid());
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.turf_slots, public.turf_bookings, public.turf_matches; END IF; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
NOTIFY pgrst, 'reload schema';
