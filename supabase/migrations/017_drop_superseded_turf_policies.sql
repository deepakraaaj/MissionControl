-- Fixes a mistake in 016.
--
-- Migration 012 named the turf policies after the table with a space —
-- "approved members can use turf projects" — but 016's DROP interpolated the
-- table identifier, producing "approved members can use turf_projects". The
-- names never matched, so the originals survived and 016 added a second
-- permissive policy alongside each of them.
--
-- Postgres evaluates every permissive policy, so turf_projects, turf_venues and
-- turf_slots have been paying for both. Drop the superseded originals; the
-- underscore-named policies created by 016 are the ones to keep, since they use
-- the hoisted private.approved_room_ids() lookup.

DROP POLICY IF EXISTS "approved members can use turf projects" ON public.turf_projects;
DROP POLICY IF EXISTS "approved members can use turf venues"   ON public.turf_venues;
DROP POLICY IF EXISTS "approved members can use turf slots"    ON public.turf_slots;

-- 012's bookings and matches policies were replaced by name in 016, so those
-- two tables were never doubled up. Asserted rather than assumed:
DO $$
DECLARE dupes int;
BEGIN
  SELECT count(*) INTO dupes
  FROM (
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'turf%'
    GROUP BY tablename, cmd HAVING count(*) > 1
  ) AS t;

  IF dupes > 0 THEN
    RAISE EXCEPTION 'turf tables still carry % duplicated permissive policies', dupes;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
