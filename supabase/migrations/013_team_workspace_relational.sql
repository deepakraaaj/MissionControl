-- Team workspace, relational.
--
-- Replaces the single `team_room_state.data` JSONB blob with real tables so the
-- workspace is queryable, diffable, and no longer round-trips through hardcoded
-- seed constants in the app bundle.
--
-- Ids stay `text` on purpose: the client generates them (`lead-…`, `tt-…`,
-- `diagram-…`) and they are already referenced by chat messages as ChatRef.id.
-- Every table carries `room_id` directly so RLS is a single, cheap predicate
-- rather than a join chain.

-- ──────────────────────────────────────────
-- Projects (the workspace's "missions")
CREATE TABLE IF NOT EXISTS public.team_projects (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT 'Target',
  color text NOT NULL DEFAULT 'emerald',
  objective text NOT NULL DEFAULT '',
  why_it_matters text NOT NULL DEFAULT '',
  definition_of_success text NOT NULL DEFAULT '',
  customer_segment text,
  revenue_model text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed')),
  is_pinned boolean NOT NULL DEFAULT false,
  target_date text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Leads (BizDev pipeline)
CREATE TABLE IF NOT EXISTS public.team_leads (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  category text NOT NULL DEFAULT 'Other' CHECK (category IN ('Turf','Gym','Retail','Seasonal','Other')),
  owner_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  location_url text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','meeting_set','active_pilot','paid_client','lost')),
  notes text NOT NULL DEFAULT '',
  next_follow_up text,
  pilot_start_date text,
  pilot_end_date text,
  monthly_value integer,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Workflow SOPs. `steps` stays JSONB: an ordered checklist is always read and
-- written whole, and never queried across workflows.
CREATE TABLE IF NOT EXISTS public.team_workflows (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_outcome text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Work links
CREATE TABLE IF NOT EXISTS public.team_work_links (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT 'doc' CHECK (category IN ('demo','repo','design','doc','drive')),
  description text,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Problem bank (issues / friction / ideas)
CREATE TABLE IF NOT EXISTS public.team_problems (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  audience_category text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'friction' CHECK (severity IN ('blocker','friction','idea')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','solved')),
  tags text[] NOT NULL DEFAULT '{}',
  logged_by text NOT NULL DEFAULT '',
  solved_notes text,
  evidence text,
  impact text,
  next_action text,
  owner text,
  due_date text,
  occurrence_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Visual diagrams. Nodes/edges are a graph payload: always loaded together and
-- rewritten wholesale by the canvas, so JSONB rather than two child tables.
CREATE TABLE IF NOT EXISTS public.team_diagrams (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  diagram_type text NOT NULL DEFAULT 'custom'
    CHECK (diagram_type IN ('user_journey','system_arch','payment_flow','custom')),
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Team notes
CREATE TABLE IF NOT EXISTS public.team_notes (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General'
    CHECK (category IN ('Playbook','Meeting','Field Intel','Strategy','General')),
  pinned boolean NOT NULL DEFAULT false,
  author text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────
-- Team tasks
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  outcome text,
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog','in_progress','review','done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical','high','normal','low')),
  assignee_role text NOT NULL DEFAULT 'General Member',
  due_date text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at text
);

-- ──────────────────────────────────────────
-- Chat. `refs`/`reactions` are message-local payloads, read only with their row.
CREATE TABLE IF NOT EXISTS public.team_chat_messages (
  id text PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.team_rooms(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.team_projects(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'message' CHECK (kind IN ('message','system')),
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
  parent_id text,
  mentions text[] NOT NULL DEFAULT '{}',
  spawned jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

-- ──────────────────────────────────────────
-- Indexes: every read is "everything in this room", ordered.
CREATE INDEX IF NOT EXISTS idx_team_projects_room ON public.team_projects(room_id);
CREATE INDEX IF NOT EXISTS idx_team_leads_room ON public.team_leads(room_id);
CREATE INDEX IF NOT EXISTS idx_team_workflows_room ON public.team_workflows(room_id);
CREATE INDEX IF NOT EXISTS idx_team_work_links_room ON public.team_work_links(room_id);
CREATE INDEX IF NOT EXISTS idx_team_problems_room ON public.team_problems(room_id);
CREATE INDEX IF NOT EXISTS idx_team_diagrams_room ON public.team_diagrams(room_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_room ON public.team_notes(room_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_room ON public.team_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_room ON public.team_chat_messages(room_id, created_at);

-- ──────────────────────────────────────────
-- RLS: approved members of the room, for every table, via the existing helper.
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_work_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'team_projects','team_leads','team_workflows','team_work_links',
    'team_problems','team_diagrams','team_notes','team_tasks','team_chat_messages'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "approved members manage %1$s" ON public.%1$I', t
    );
    EXECUTE format(
      'CREATE POLICY "approved members manage %1$s" ON public.%1$I FOR ALL '
      'USING (public.is_approved_room_member(room_id)) '
      'WITH CHECK (public.is_approved_room_member(room_id))', t
    );
  END LOOP;
END $$;

-- ──────────────────────────────────────────
-- Realtime, so a teammate's edit lands without a refresh.
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY[
      'team_projects','team_leads','team_workflows','team_work_links',
      'team_problems','team_diagrams','team_notes','team_tasks','team_chat_messages'
    ] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
