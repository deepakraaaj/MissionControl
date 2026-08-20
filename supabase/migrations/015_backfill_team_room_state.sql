-- Backfill the relational team workspace from the old `team_room_state.data` blob.
--
-- Migration 013 moved the workspace into real tables; everything a room already
-- had still lives in the JSONB blob. This copies it across so no room comes back
-- empty. The blob is left in place — dropping it is a separate, deliberate call
-- once the relational tables have been verified in production.
--
-- Safe to re-run: every insert is ON CONFLICT DO NOTHING.

DO $$
DECLARE
  r record;
  d jsonb;
BEGIN
  FOR r IN SELECT room_id, data FROM public.team_room_state LOOP
    d := r.data;
    CONTINUE WHEN d IS NULL OR jsonb_typeof(d) <> 'object';

    -- Projects first: everything else carries a FK onto them.
    INSERT INTO public.team_projects (
      id, room_id, title, description, icon_name, color, objective, why_it_matters,
      definition_of_success, customer_segment, revenue_model, status, is_pinned,
      target_date, tags, sort_order
    )
    SELECT
      e->>'id', r.room_id,
      COALESCE(e->>'title', 'Untitled project'),
      COALESCE(e->>'description', ''),
      COALESCE(e->>'iconName', 'Target'),
      COALESCE(e->>'color', 'emerald'),
      COALESCE(e->>'objective', ''),
      COALESCE(e->>'why_it_matters', ''),
      COALESCE(e->>'definition_of_success', ''),
      e->>'customer_segment',
      e->>'revenue_model',
      COALESCE(NULLIF(e->>'status', ''), 'active'),
      COALESCE((e->>'is_pinned')::boolean, false),
      COALESCE(e->>'target_date', ''),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(e->'tags')), '{}'),
      (ord - 1)::int
    FROM jsonb_array_elements(COALESCE(d->'teamMissions', '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
    WHERE e->>'id' IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_leads (
      id, room_id, project_id, business_name, category, owner_name, phone, location,
      location_url, status, notes, next_follow_up, pilot_start_date, pilot_end_date,
      monthly_value, created_by, created_at, updated_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'businessName', 'Untitled'),
      COALESCE(NULLIF(e->>'category', ''), 'Other'),
      COALESCE(e->>'ownerName', ''), COALESCE(e->>'phone', ''), COALESCE(e->>'location', ''),
      e->>'locationUrl',
      COALESCE(NULLIF(e->>'status', ''), 'new'),
      COALESCE(e->>'notes', ''),
      e->>'nextFollowUp', e->>'pilotStartDate', e->>'pilotEndDate',
      (e->>'monthlyValue')::int,
      COALESCE(e->>'createdBy', ''),
      COALESCE((e->>'createdAt')::timestamptz, now()),
      COALESCE((e->>'updatedAt')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(d->'leads', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_workflows (
      id, room_id, project_id, title, description, target_outcome, steps, status, sort_order
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'title', 'Untitled'),
      COALESCE(e->>'description', ''),
      COALESCE(e->>'targetOutcome', ''),
      COALESCE(e->'steps', '[]'::jsonb),
      COALESCE(NULLIF(e->>'status', ''), 'draft'),
      (ord - 1)::int
    FROM jsonb_array_elements(COALESCE(d->'workflows', '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_work_links (
      id, room_id, project_id, title, url, category, description, added_by, created_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'title', 'Untitled'),
      COALESCE(e->>'url', ''),
      COALESCE(NULLIF(e->>'category', ''), 'doc'),
      e->>'description', e->>'addedBy',
      COALESCE((e->>'createdAt')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(d->'workLinks', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_problems (
      id, room_id, project_id, audience_category, title, description, source, severity,
      status, tags, logged_by, solved_notes, evidence, impact, next_action, owner,
      due_date, occurrence_count, created_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'audienceCategory', ''),
      COALESCE(e->>'title', 'Untitled'),
      COALESCE(e->>'description', ''),
      COALESCE(e->>'source', ''),
      COALESCE(NULLIF(e->>'severity', ''), 'friction'),
      COALESCE(NULLIF(e->>'status', ''), 'open'),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(e->'tags')), '{}'),
      COALESCE(e->>'loggedBy', ''),
      e->>'solvedNotes', e->>'evidence', e->>'impact', e->>'nextAction', e->>'owner',
      e->>'dueDate',
      (e->>'occurrenceCount')::int,
      COALESCE((e->>'createdAt')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(d->'problems', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_diagrams (
      id, room_id, project_id, title, description, diagram_type, nodes, edges, sort_order, updated_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'title', 'Untitled'),
      COALESCE(e->>'description', ''),
      COALESCE(NULLIF(e->>'diagramType', ''), 'custom'),
      COALESCE(e->'nodes', '[]'::jsonb),
      COALESCE(e->'edges', '[]'::jsonb),
      (ord - 1)::int,
      COALESCE((e->>'updatedAt')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(d->'diagrams', '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_notes (
      id, room_id, project_id, title, content, category, pinned, author, created_at, updated_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'title', 'Untitled'),
      COALESCE(e->>'content', ''),
      COALESCE(NULLIF(e->>'category', ''), 'General'),
      COALESCE((e->>'pinned')::boolean, false),
      COALESCE(e->>'author', ''),
      COALESCE((e->>'createdAt')::timestamptz, now()),
      COALESCE((e->>'updatedAt')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(d->'teamNotes', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_tasks (
      id, room_id, project_id, title, outcome, status, priority, assignee_role,
      due_date, created_at, completed_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(e->>'title', 'Untitled'),
      e->>'outcome',
      COALESCE(NULLIF(e->>'status', ''), 'backlog'),
      COALESCE(NULLIF(e->>'priority', ''), 'normal'),
      COALESCE(NULLIF(e->>'assigneeRole', ''), 'General Member'),
      e->>'dueDate',
      COALESCE((e->>'createdAt')::timestamptz, now()),
      e->>'completedAt'
    FROM jsonb_array_elements(COALESCE(d->'teamTasks', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.team_chat_messages (
      id, room_id, project_id, kind, author_name, body, refs, reactions, parent_id,
      mentions, spawned, created_at, edited_at
    )
    SELECT
      e->>'id', r.room_id, e->>'missionId',
      COALESCE(NULLIF(e->>'kind', ''), 'message'),
      COALESCE(e->>'authorName', ''),
      COALESCE(e->>'body', ''),
      COALESCE(e->'refs', '[]'::jsonb),
      COALESCE(e->'reactions', '[]'::jsonb),
      e->>'parentId',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(e->'mentions')), '{}'),
      e->'spawned',
      COALESCE((e->>'createdAt')::timestamptz, now()),
      (e->>'editedAt')::timestamptz
    FROM jsonb_array_elements(COALESCE(d->'chatMessages', '[]'::jsonb)) AS e
    WHERE e->>'id' IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.team_projects p WHERE p.id = e->>'missionId')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
