# Cloud Sync (Supabase) Setup

SynCatch runs fully offline by default (local SQLite). Supabase adds optional authentication and cross-device cloud sync. This guide covers configuring and testing it.

## Overview

| Concern | Where it lives |
|---------|----------------|
| Client init, session persistence | `src/lib/auth.ts` |
| Auth state (Zustand) | `src/features/auth/auth-store.ts` |
| Sign-in / sign-up UI | `src/features/auth/SignInScreen.tsx` |
| Auth gating | `src/app/main/MainAppWithAuth.tsx` |
| Data query helpers | `src/lib/supabase.ts` |
| Cloud-backed repositories | `src/features/*/{task,focus,preferences,activity}-repository.ts` |
| Schema + RLS | `supabase/migrations/001_init_schema.sql` |

Each repository auto-selects its local or Supabase implementation based on environment configuration, so the rest of the app is unaware of the backend.

---

## 1. Create the database schema

In the Supabase dashboard → **Database → SQL Editor**, run the contents of:
```
supabase/migrations/001_init_schema.sql
```
This creates the multi-user `tasks`, focus-state, preferences (key-value), and activity-log tables, enables **Row Level Security** on all of them, and adds `updated_at` triggers.

Run every migration in numeric order, including `009_add_team_rooms.sql`. Migration 009 adds Team Hub rooms, approval-only memberships, secure room RPCs, RLS policies, and realtime shared room state.

Migrations 013-015 move the team workspace off the single `team_room_state` JSONB
blob and onto real tables:

| Migration | What it does |
| --- | --- |
| `013_team_workspace_relational.sql` | Creates `team_projects`, `team_leads`, `team_workflows`, `team_work_links`, `team_problems`, `team_diagrams`, `team_notes`, `team_tasks` and `team_chat_messages`, each with RLS scoped to approved room members, plus realtime. |
| `014_seed_turf_booking_workspace.sql` | Adds `seed_turf_workspace(room_id)`, which populates a room with the turf booking project — tasks, issues, diagrams, notes, leads, links and SOPs. |
| `015_backfill_team_room_state.sql` | Copies whatever each room already had in the old JSONB blob into the new tables. Run it once, after 013. |

The app no longer ships any seed content: a room renders exactly what the backend
holds. To populate a room with the turf booking workspace, run this once with the
room's id (**Database → SQL Editor**, signed in as an approved member of that room):

```sql
SELECT public.seed_turf_workspace('<room-uuid>');
```

It is idempotent, so re-running only adds what is missing. `team_room_state` is
left in place after the backfill; drop it once you have verified the relational
tables in production.

## 2. Configure environment variables

Add to `.env.local` in the project root:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
For CI release builds, set the same two values as GitHub Actions secrets.

## 3. Test authentication

**Web:**
```bash
npm run dev
```
Open http://localhost:1420 → you should see the Sign-In screen. Sign up with a test email/password; you should land in the main app. Settings → Account → Sign Out should work.

**Desktop:**
```bash
npm run tauri:dev
```
Same flow inside the Tauri window. Sessions persist across restarts via `localStorage`.

## 4. Verify data round-trips

1. Create a task in the app.
2. In Supabase SQL Editor: `SELECT * FROM tasks WHERE user_id = '<your-user-id>';`
3. The task should appear. Updates and deletes should reflect there too.

---

## Architecture

```
AppBootstrap (checks auth)
   ├─ Not authenticated → SignInScreen → sign in/up → session saved → re-bootstrap
   └─ Authenticated     → MainApp (uses Supabase repositories)
```

## Security notes

1. **RLS enabled** — users only see their own rows.
2. **Anon key is public** — JWT verification happens server-side; this is expected.
3. **Sessions in `localStorage`** — shared across tabs/windows, persisted across reloads.

---

## Future enhancements

- [ ] Generate TypeScript types from the Supabase schema
- [ ] Realtime subscriptions for live multi-device sync
- [ ] Offline-first SQLite cache layered over the cloud
- [ ] SQLite → Supabase data migration script
- [ ] Tauri Keyring for encrypted desktop session storage
- [ ] User profile management and data export/backup

See also: [Developer Guide](developer-guide.md)
