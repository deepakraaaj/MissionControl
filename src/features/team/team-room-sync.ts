import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/auth';
import { useTeamStore } from './team-store';
import { INITIAL_DIAGRAMS, INITIAL_LEADS, INITIAL_PROBLEMS, INITIAL_TEAM_NOTES, INITIAL_TEAM_TASKS, INITIAL_WORKFLOWS, INITIAL_WORK_LINKS } from './team-seed';

const DATA_KEYS = [
  'teamMissions', 'selectedTeamMissionId', 'leads', 'workflows', 'workLinks',
  'problems', 'diagrams', 'teamNotes', 'teamTasks',
] as const;

type SharedTeamState = Pick<ReturnType<typeof useTeamStore.getState>, (typeof DATA_KEYS)[number]>;
const EMPTY_ROOM_STATE: SharedTeamState = {
  teamMissions: [], selectedTeamMissionId: null, leads: [], workflows: [], workLinks: [],
  problems: [], diagrams: [], teamNotes: [], teamTasks: [],
};
const KUMBAKONAM_PROJECT: SharedTeamState['teamMissions'][number] = {
  id: 'm-turf-booking-app', title: 'Turf booking app', description: 'Shared turf booking, team roster, and live scorebook for Kumbakonam.', iconName: 'Activity', color: 'emerald', objective: 'Let the team discover open turf slots, book together, and track every match score.', why_it_matters: 'Remove WhatsApp back-and-forth and make every booking visible to the whole team.', definition_of_success: 'Every turf slot, booking, and match score is recorded in one shared room workspace.', status: 'active', is_pinned: true, target_date: '2026-09-30', tags: ['Turf', 'Booking', 'Team scorebook'],
};
const KUMBAKONAM_CONTENT: Pick<SharedTeamState, 'leads' | 'workflows' | 'workLinks' | 'problems' | 'diagrams' | 'teamNotes' | 'teamTasks'> = {
  leads: INITIAL_LEADS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  workflows: INITIAL_WORKFLOWS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  workLinks: INITIAL_WORK_LINKS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  problems: INITIAL_PROBLEMS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  diagrams: INITIAL_DIAGRAMS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  teamNotes: INITIAL_TEAM_NOTES.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
  teamTasks: INITIAL_TEAM_TASKS.filter((item) => item.missionId === 'm-turf').map((item) => ({ ...item, missionId: KUMBAKONAM_PROJECT.id })),
};
let unsubscribeStore: (() => void) | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let saveTimer: number | null = null;
let currentRoomId: string | null = null;
let applyingRemoteState = false;

const snapshot = (): SharedTeamState => {
  const state = useTeamStore.getState();
  return Object.fromEntries(DATA_KEYS.map((key) => [key, state[key]])) as SharedTeamState;
};

const applySharedState = (data: unknown) => {
  if (!data || typeof data !== 'object' || !('teamMissions' in data)) return;
  applyingRemoteState = true;
  useTeamStore.setState(data as Partial<ReturnType<typeof useTeamStore.getState>>);
  queueMicrotask(() => { applyingRemoteState = false; });
};

const save = async (roomId: string) => {
  const client = getSupabaseClient();
  const { data: authData } = await client.auth.getUser();
  if (!authData.user || roomId !== currentRoomId) return;
  const { error } = await client.from('team_room_state').upsert({
    room_id: roomId, data: snapshot(), updated_by: authData.user.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'room_id' });
  if (error) console.error('Team room sync failed:', error.message);
};

export async function connectTeamRoomSync(roomId: string, roomName?: string): Promise<void> {
  disconnectTeamRoomSync();
  currentRoomId = roomId;
  const client = getSupabaseClient();
  const { data, error } = await client.from('team_room_state').select('data').eq('room_id', roomId).maybeSingle();
  if (error) throw error;
  const existing = data?.data && Object.keys(data.data as object).length > 0 ? data.data as SharedTeamState : EMPTY_ROOM_STATE;
  const isKumbakonam = roomName?.toLowerCase().includes('kumbakonam');
  const hasTurfProject = existing.teamMissions.some((project) => project.id === KUMBAKONAM_PROJECT.id);
  const hasTurfContent = existing.teamTasks.some((item) => item.missionId === KUMBAKONAM_PROJECT.id);
  const merged = isKumbakonam && (!hasTurfProject || !hasTurfContent)
    ? { ...existing, ...(!hasTurfContent ? KUMBAKONAM_CONTENT : {}), teamMissions: hasTurfProject ? existing.teamMissions : [KUMBAKONAM_PROJECT, ...existing.teamMissions], selectedTeamMissionId: existing.selectedTeamMissionId ?? KUMBAKONAM_PROJECT.id }
    : existing;
  applySharedState(merged);
  if (merged !== existing) await save(roomId);

  unsubscribeStore = useTeamStore.subscribe(() => {
    if (applyingRemoteState || !currentRoomId) return;
    if (saveTimer) window.clearTimeout(saveTimer);
    const targetRoom = currentRoomId;
    saveTimer = window.setTimeout(() => void save(targetRoom), 700);
  });

  realtimeChannel = client.channel(`team-room-${roomId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_room_state', filter: `room_id=eq.${roomId}` }, (payload) => {
      if (roomId === currentRoomId) applySharedState((payload.new as { data?: unknown }).data);
    }).subscribe();
}

export function disconnectTeamRoomSync(): void {
  unsubscribeStore?.();
  unsubscribeStore = null;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = null;
  if (realtimeChannel) void getSupabaseClient().removeChannel(realtimeChannel);
  realtimeChannel = null;
  currentRoomId = null;
}
