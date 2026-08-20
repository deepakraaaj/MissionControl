-- Remove database objects nothing uses, and finish the RLS pass 016 started.
--
-- Three groups of dead weight:
--
--   1. turf_projects / turf_venues / turf_slots / turf_bookings / turf_matches.
--      Migration 012 built a turf *booking* backend — venues, time slots,
--      bookings, match scores. The UI for it was never finished and its only
--      consumer (TurfBookingView.tsx) was deleted. All five tables are empty
--      and no code references them. Not to be confused with the team_* tables,
--      which hold the turf booking *project workspace* and are very much live.
--
--   2. team_room_state. Superseded by the relational tables in 013; migration
--      015 copied its contents across. No code has referenced it since.
--
--   3. is_turf_room_member(), which exists only to serve the turf policies.
--
-- Plus two policies 016 missed, still calling the per-row public helpers.
--
-- Ordering matters: rescue first, prove nothing is stranded, and only then
-- drop. If the assertion fails the whole migration rolls back and no data is
-- lost.

-- ──────────────────────────────────────────
-- 1. Rescue anything still living only in the legacy blob.
--
-- 015 skipped rows whose project did not exist at the time it ran. At least one
-- diagram was written to the blob afterwards by the pre-013 client, so it never
-- made the jump. Its project exists now, so the same insert picks it up.
INSERT INTO public.team_diagrams (
  id, room_id, project_id, title, description, diagram_type, nodes, edges, sort_order, updated_at
)
SELECT
  e->>'id', s.room_id, e->>'missionId',
  COALESCE(e->>'title', 'Untitled'),
  COALESCE(e->>'description', ''),
  COALESCE(NULLIF(e->>'diagramType', ''), 'custom'),
  COALESCE(e->'nodes', '[]'::jsonb),
  COALESCE(e->'edges', '[]'::jsonb),
  1000 + (ord - 1)::int,
  COALESCE((e->>'updatedAt')::timestamptz, now())
FROM public.team_room_state s,
     jsonb_array_elements(COALESCE(s.data->'diagrams', '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
WHERE e->>'id' IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────
-- 2. Refuse to drop the blob while it still holds anything unique.
DO $$
DECLARE
  stranded text;
BEGIN
  WITH blob AS (
    SELECT k AS coll, e->>'id' AS id
    FROM public.team_room_state,
         unnest(ARRAY['teamMissions','leads','workflows','workLinks','problems',
                      'diagrams','teamNotes','teamTasks','chatMessages']) AS k,
         jsonb_array_elements(COALESCE(data->k, '[]'::jsonb)) AS e
  ),
  rel AS (
    SELECT 'teamMissions' AS c, id FROM public.team_projects UNION ALL
    SELECT 'leads',            id FROM public.team_leads UNION ALL
    SELECT 'workflows',        id FROM public.team_workflows UNION ALL
    SELECT 'workLinks',        id FROM public.team_work_links UNION ALL
    SELECT 'problems',         id FROM public.team_problems UNION ALL
    SELECT 'diagrams',         id FROM public.team_diagrams UNION ALL
    SELECT 'teamNotes',        id FROM public.team_notes UNION ALL
    SELECT 'teamTasks',        id FROM public.team_tasks UNION ALL
    SELECT 'chatMessages',     id FROM public.team_chat_messages
  )
  SELECT string_agg(b.coll || ':' || b.id, ', ')
  INTO stranded
  FROM blob b
  LEFT JOIN rel r ON r.c = b.coll AND r.id = b.id
  WHERE r.id IS NULL;

  IF stranded IS NOT NULL THEN
    RAISE EXCEPTION
      'Refusing to drop team_room_state: % exist only in the legacy blob', stranded;
  END IF;
END $$;

DROP TABLE IF EXISTS public.team_room_state;

-- ──────────────────────────────────────────
-- 3. The unbuilt turf booking backend. Empty and unreferenced; CASCADE clears
--    the policies, indexes and FKs along with them.
DROP TABLE IF EXISTS public.turf_bookings CASCADE;
DROP TABLE IF EXISTS public.turf_matches  CASCADE;
DROP TABLE IF EXISTS public.turf_slots    CASCADE;
DROP TABLE IF EXISTS public.turf_venues   CASCADE;
DROP TABLE IF EXISTS public.turf_projects CASCADE;

-- Existed only for those policies.
DROP FUNCTION IF EXISTS public.is_turf_room_member(uuid);

-- ──────────────────────────────────────────
-- 4. The two policies 016 left on the per-row public helpers.
DROP POLICY IF EXISTS room_admins_can_update ON public.team_rooms;
CREATE POLICY room_admins_can_update ON public.team_rooms FOR UPDATE
  USING (private.is_room_admin(id))
  WITH CHECK (private.is_room_admin(id));

-- ──────────────────────────────────────────
-- 5. public.is_approved_room_member() stays. seed_turf_workspace() is still its
--    caller, and that function remains useful for populating a new room — its
--    content is 400 lines of turf workspace, so re-pointing it at the hoisted
--    helper would mean duplicating all of it in this migration for one advisor
--    warning on a function that runs once per room. Not worth the trade.

NOTIFY pgrst, 'reload schema';
