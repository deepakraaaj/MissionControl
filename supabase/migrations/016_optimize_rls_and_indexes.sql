-- Database optimisation pass.
--
-- Three classes of problem, all reported by `supabase db advisors`:
--
--   1. auth_rls_initplan (33 findings) — a bare `auth.uid()` in a policy is
--      re-evaluated for every row scanned. Wrapping it as `(SELECT auth.uid())`
--      turns it into an InitPlan that runs once per query.
--
--   2. multiple_permissive_policies (96 findings) — tasks, activity_log,
--      app_preferences and focus_state each carry two byte-identical policies
--      from overlapping earlier migrations. Postgres evaluates every permissive
--      policy, so the second one is pure overhead.
--
--   3. 19 foreign keys with no index. Unindexed FKs make the parent-side
--      DELETE/UPDATE check a sequential scan on the child table.
--
-- The team_* tables get a fourth fix: their policies called
-- is_approved_room_member(room_id) once per row, because the argument varies by
-- row and so cannot be hoisted. Replaced with a set-returning variant used as
-- `room_id IN (SELECT ...)`, which the planner evaluates once and hashes.

-- ──────────────────────────────────────────
-- 1. Drop the duplicate policies. Verified byte-identical to the ones kept:
--    both were `(auth.uid() = user_id)` for USING and WITH CHECK.
DROP POLICY IF EXISTS tasks_are_private            ON public.tasks;
DROP POLICY IF EXISTS activity_log_is_private      ON public.activity_log;
DROP POLICY IF EXISTS app_preferences_are_private  ON public.app_preferences;
DROP POLICY IF EXISTS focus_state_is_private       ON public.focus_state;

-- ──────────────────────────────────────────
-- 2. Per-user tables: same rule, hoisted auth lookup.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('tasks',           'tasks_private'),
      ('missions',        'missions_private'),
      ('activity_log',    'activity_log_private'),
      ('app_preferences', 'app_preferences_private'),
      ('focus_state',     'focus_state_private'),
      ('work_sessions',   'work_sessions_private'),
      ('collaborators',   'collaborators_private')
    ) AS t(tbl, pol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', spec.pol, spec.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL '
      'USING ((SELECT auth.uid()) = user_id) '
      'WITH CHECK ((SELECT auth.uid()) = user_id)',
      spec.pol, spec.tbl
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 3. Tables that split the rule across four command-specific policies.
DO $$
DECLARE
  tbl  text;
  noun text;
BEGIN
  FOR tbl, noun IN
    SELECT * FROM (VALUES
      ('journal_entries', 'journal entries'),
      ('journal_days',    'journal days'),
      ('note_categories', 'note categories'),
      ('notes',           'notes')
    ) AS t(a, b)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can view their own '   || noun, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can create their own ' || noun, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can update their own ' || noun, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can delete their own ' || noun, tbl);

    -- One FOR ALL policy replaces the four: identical rule, a quarter of the
    -- policy evaluations, and no duplicate-permissive warning.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL '
      'USING ((SELECT auth.uid()) = user_id) '
      'WITH CHECK ((SELECT auth.uid()) = user_id)',
      tbl || '_private', tbl
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 4. Room membership, hoisted once per query instead of once per row.
-- `private` is not in PostgREST's exposed schema list, so nothing in here
-- becomes a REST endpoint. Both roles still need EXECUTE: a policy expression
-- is evaluated as the querying role, and an anon request that cannot run the
-- function errors out instead of simply matching no rows.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.approved_room_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id
  FROM public.team_room_memberships
  WHERE user_id = (SELECT auth.uid()) AND status = 'approved';
$$;

CREATE OR REPLACE FUNCTION private.is_room_admin(target_room uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_room_memberships
    WHERE room_id = target_room AND user_id = (SELECT auth.uid())
      AND status = 'approved' AND role IN ('owner', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION private.approved_room_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_room_admin(uuid) TO anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'team_projects','team_leads','team_workflows','team_work_links',
    'team_problems','team_diagrams','team_notes','team_tasks','team_chat_messages'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "approved members manage %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "approved members manage %1$s" ON public.%1$I FOR ALL '
      'USING (room_id IN (SELECT private.approved_room_ids())) '
      'WITH CHECK (room_id IN (SELECT private.approved_room_ids()))', t
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- 5. Remaining room policies that referenced auth.uid() directly.
DROP POLICY IF EXISTS room_members_can_read ON public.team_rooms;
CREATE POLICY room_members_can_read ON public.team_rooms FOR SELECT
  USING (id IN (SELECT private.approved_room_ids()) OR created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS memberships_visible_to_self_or_admin ON public.team_room_memberships;
CREATE POLICY memberships_visible_to_self_or_admin ON public.team_room_memberships FOR SELECT
  USING (user_id = (SELECT auth.uid()) OR private.is_room_admin(room_id));

DROP POLICY IF EXISTS approved_members_insert_room_state ON public.team_room_state;
CREATE POLICY approved_members_insert_room_state ON public.team_room_state FOR INSERT
  WITH CHECK (room_id IN (SELECT private.approved_room_ids()) AND updated_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS approved_members_update_room_state ON public.team_room_state;
CREATE POLICY approved_members_update_room_state ON public.team_room_state FOR UPDATE
  USING (room_id IN (SELECT private.approved_room_ids()))
  WITH CHECK (room_id IN (SELECT private.approved_room_ids()) AND updated_by = (SELECT auth.uid()));

-- ──────────────────────────────────────────
-- 6. Turf tables: hoist the auth lookup in the WITH CHECK ownership test.
DROP POLICY IF EXISTS "approved members can use turf bookings" ON public.turf_bookings;
CREATE POLICY "approved members can use turf bookings" ON public.turf_bookings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.turf_slots s
    JOIN public.turf_venues v ON v.id = s.venue_id
    JOIN public.turf_projects p ON p.id = v.project_id
    WHERE s.id = slot_id AND p.room_id IN (SELECT private.approved_room_ids())))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.turf_slots s
    JOIN public.turf_venues v ON v.id = s.venue_id
    JOIN public.turf_projects p ON p.id = v.project_id
    WHERE s.id = slot_id AND p.room_id IN (SELECT private.approved_room_ids()))
    AND booked_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "approved members can use turf matches" ON public.turf_matches;
CREATE POLICY "approved members can use turf matches" ON public.turf_matches FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.turf_projects p
    WHERE p.id = project_id AND p.room_id IN (SELECT private.approved_room_ids())))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.turf_projects p
    WHERE p.id = project_id AND p.room_id IN (SELECT private.approved_room_ids()))
    AND created_by = (SELECT auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['turf_projects','turf_venues','turf_slots'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "approved members can use %1$s" ON public.%1$I', t);
  END LOOP;
END $$;

CREATE POLICY "approved members can use turf_projects" ON public.turf_projects FOR ALL
  USING (room_id IN (SELECT private.approved_room_ids()))
  WITH CHECK (room_id IN (SELECT private.approved_room_ids()));

CREATE POLICY "approved members can use turf_venues" ON public.turf_venues FOR ALL
  USING (EXISTS (SELECT 1 FROM public.turf_projects p
                 WHERE p.id = project_id AND p.room_id IN (SELECT private.approved_room_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.turf_projects p
                      WHERE p.id = project_id AND p.room_id IN (SELECT private.approved_room_ids())));

CREATE POLICY "approved members can use turf_slots" ON public.turf_slots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.turf_venues v
                 JOIN public.turf_projects p ON p.id = v.project_id
                 WHERE v.id = venue_id AND p.room_id IN (SELECT private.approved_room_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.turf_venues v
                      JOIN public.turf_projects p ON p.id = v.project_id
                      WHERE v.id = venue_id AND p.room_id IN (SELECT private.approved_room_ids())));

-- ──────────────────────────────────────────
-- 7. Index every foreign key that lacked one.
CREATE INDEX IF NOT EXISTS idx_team_projects_sort        ON public.team_projects(room_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_team_leads_project        ON public.team_leads(project_id);
CREATE INDEX IF NOT EXISTS idx_team_workflows_project    ON public.team_workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_team_work_links_project   ON public.team_work_links(project_id);
CREATE INDEX IF NOT EXISTS idx_team_problems_project     ON public.team_problems(project_id);
CREATE INDEX IF NOT EXISTS idx_team_diagrams_project     ON public.team_diagrams(project_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_project        ON public.team_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_project        ON public.team_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_project         ON public.team_chat_messages(project_id);

CREATE INDEX IF NOT EXISTS idx_team_rooms_created_by     ON public.team_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_team_memberships_reviewer ON public.team_room_memberships(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_team_room_state_updated_by ON public.team_room_state(updated_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_linked    ON public.journal_entries(linked_entry_id);

CREATE INDEX IF NOT EXISTS idx_turf_projects_created_by  ON public.turf_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_turf_venues_project       ON public.turf_venues(project_id);
CREATE INDEX IF NOT EXISTS idx_turf_bookings_slot        ON public.turf_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_turf_bookings_booked_by   ON public.turf_bookings(booked_by);
CREATE INDEX IF NOT EXISTS idx_turf_matches_project      ON public.turf_matches(project_id);
CREATE INDEX IF NOT EXISTS idx_turf_matches_slot         ON public.turf_matches(slot_id);
CREATE INDEX IF NOT EXISTS idx_turf_matches_created_by   ON public.turf_matches(created_by);

-- The membership lookup behind approved_room_ids() runs on every team query.
CREATE INDEX IF NOT EXISTS idx_team_memberships_approved
  ON public.team_room_memberships(user_id, room_id) WHERE status = 'approved';

-- ──────────────────────────────────────────
-- 8. Pin the trigger function's search_path (advisor: function_search_path_mutable).
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 9. With every policy above moved to the private helpers, the public
--    SECURITY DEFINER copies are no longer referenced by any policy, so
--    withdrawing anon's access to them breaks nothing.
REVOKE EXECUTE ON FUNCTION public.is_approved_room_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_room_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_turf_room_member(uuid) FROM anon;

ANALYZE;

NOTIFY pgrst, 'reload schema';
