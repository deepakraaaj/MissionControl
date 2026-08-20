-- activity_log logged 14 event types (task selection, lane changes, focus
-- start/pause/resume, HUD toggles, a "log a distraction" composer) into a
-- table nothing ever reads back. `listRecentActivity()` had zero callers
-- anywhere in the app, and the whole distraction-insights.ts summarisation
-- module — categories, trigger analysis, avoidance tips — was never invoked
-- either. 750 rows over 3.5 months, growing purely because nothing pruned it
-- and nothing displayed it.
--
-- The write side (task-store.ts, focus-store.ts, HudApp.tsx's distraction
-- composer) and the read side (activity-repository.ts, distraction-insights.ts,
-- insertActivity/selectRecentActivity in lib/supabase.ts) are removed in the
-- same change as this migration. This drops what backed them.

DROP TABLE IF EXISTS public.activity_log;

NOTIFY pgrst, 'reload schema';
