BEGIN;

-- ============================================================
-- Shared updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.syncatch_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- Loved Ones
-- ============================================================

CREATE TABLE IF NOT EXISTS public.loved_ones (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  relationship TEXT NOT NULL DEFAULT '',
  birthday DATE NOT NULL,

  loves JSONB NOT NULL DEFAULT '[]'::jsonb,
  gift_ideas JSONB NOT NULL DEFAULT '[]'::jsonb,
  observations JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT loved_ones_loves_array
    CHECK (jsonb_typeof(loves) = 'array'),

  CONSTRAINT loved_ones_gift_ideas_array
    CHECK (jsonb_typeof(gift_ideas) = 'array'),

  CONSTRAINT loved_ones_observations_array
    CHECK (jsonb_typeof(observations) = 'array')
);

CREATE INDEX IF NOT EXISTS loved_ones_user_id_idx
  ON public.loved_ones(user_id);

CREATE INDEX IF NOT EXISTS loved_ones_user_birthday_idx
  ON public.loved_ones(user_id, birthday);

CREATE INDEX IF NOT EXISTS loved_ones_updated_at_idx
  ON public.loved_ones(user_id, updated_at DESC);

DROP TRIGGER IF EXISTS loved_ones_set_updated_at
  ON public.loved_ones;

CREATE TRIGGER loved_ones_set_updated_at
BEFORE UPDATE ON public.loved_ones
FOR EACH ROW
EXECUTE FUNCTION public.syncatch_set_updated_at();

ALTER TABLE public.loved_ones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loved ones"
  ON public.loved_ones;

CREATE POLICY "Users can view their own loved ones"
ON public.loved_ones
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own loved ones"
  ON public.loved_ones;

CREATE POLICY "Users can create their own loved ones"
ON public.loved_ones
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own loved ones"
  ON public.loved_ones;

CREATE POLICY "Users can update their own loved ones"
ON public.loved_ones
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own loved ones"
  ON public.loved_ones;

CREATE POLICY "Users can delete their own loved ones"
ON public.loved_ones
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- ============================================================
-- Challenges
-- ============================================================

CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  emoji TEXT NOT NULL DEFAULT '🎯',
  target_days INTEGER NOT NULL DEFAULT 30
    CHECK (target_days > 0),

  mission_id TEXT,
  source_task_id TEXT,

  cadence TEXT NOT NULL DEFAULT 'daily'
    CHECK (cadence IN ('daily')),

  check_ins JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT challenges_check_ins_array
    CHECK (jsonb_typeof(check_ins) = 'array')
);

CREATE INDEX IF NOT EXISTS challenges_user_id_idx
  ON public.challenges(user_id);

CREATE INDEX IF NOT EXISTS challenges_user_created_at_idx
  ON public.challenges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS challenges_mission_id_idx
  ON public.challenges(mission_id)
  WHERE mission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS challenges_source_task_id_idx
  ON public.challenges(source_task_id)
  WHERE source_task_id IS NOT NULL;

DROP TRIGGER IF EXISTS challenges_set_updated_at
  ON public.challenges;

CREATE TRIGGER challenges_set_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.syncatch_set_updated_at();

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own challenges"
  ON public.challenges;

CREATE POLICY "Users can view their own challenges"
ON public.challenges
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own challenges"
  ON public.challenges;

CREATE POLICY "Users can create their own challenges"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own challenges"
  ON public.challenges;

CREATE POLICY "Users can update their own challenges"
ON public.challenges
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own challenges"
  ON public.challenges;

CREATE POLICY "Users can delete their own challenges"
ON public.challenges
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);


-- ============================================================
-- Permissions
-- ============================================================

REVOKE ALL ON public.loved_ones FROM anon;
REVOKE ALL ON public.challenges FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.loved_ones TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.challenges TO authenticated;

COMMIT;
