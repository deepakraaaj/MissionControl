import { create } from 'zustand';
import { getSupabaseClient } from '../../lib/auth';

export type RoomMembershipStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type RoomRole = 'owner' | 'admin' | 'member';

export interface TeamRoomAccess {
  roomId: string;
  name: string;
  inviteCode: string | null;
  membershipId: string;
  role: RoomRole;
  status: RoomMembershipStatus;
  pendingCount: number;
}

export interface TeamRoomMember {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  role: RoomRole;
  status: RoomMembershipStatus;
  requestedAt: string;
}

type RpcRow = Record<string, unknown>;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const value = error as { code?: string; message?: string; details?: string; hint?: string };
  const context = [value.details, value.hint].filter(Boolean).join(' · ');
  return `${value.code ? `${value.code}: ` : ''}${value.message || fallback}${context ? ` — ${context}` : ''}`;
};

const getAuthenticatedClient = async () => {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Sign in to your SynCatch account before opening Team Hub.');

  if (data.session.expires_at && data.session.expires_at * 1000 <= Date.now() + 30_000) {
    const refreshed = await client.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) {
      throw new Error('Your session expired. Sign out and sign in again.');
    }
  }
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user) {
    throw new Error('Your saved login is no longer valid for this Supabase project. Sign out, then sign in again.');
  }
  return client;
};

const mapRoom = (row: RpcRow): TeamRoomAccess => ({
  roomId: String(row.room_id),
  name: String(row.name),
  inviteCode: row.invite_code ? String(row.invite_code) : null,
  membershipId: String(row.membership_id),
  role: String(row.role) as RoomRole,
  status: String(row.status) as RoomMembershipStatus,
  pendingCount: Number(row.pending_count || 0),
});

interface TeamRoomState {
  rooms: TeamRoomAccess[];
  activeRoomId: string | null;
  members: TeamRoomMember[];
  loading: boolean;
  membersLoading: boolean;
  error: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createRoom: (name: string) => Promise<TeamRoomAccess>;
  requestAccess: (code: string) => Promise<TeamRoomAccess>;
  selectRoom: (roomId: string) => void;
  loadMembers: (roomId: string) => Promise<void>;
  reviewMember: (membershipId: string, decision: 'approved' | 'rejected' | 'revoked') => Promise<void>;
  regenerateCode: (roomId: string) => Promise<string>;
  clearError: () => void;
  reset: () => void;
}

export const useTeamRoomStore = create<TeamRoomState>((set, get) => ({
  rooms: [],
  activeRoomId: localStorage.getItem('syncatch-active-team-room'),
  members: [],
  loading: false,
  membersLoading: false,
  error: null,
  hydrated: false,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const client = await getAuthenticatedClient();
      const { data, error } = await client.rpc('get_my_team_rooms');
      if (error) throw error;
      const rooms = ((data || []) as RpcRow[]).map(mapRoom);
      const savedId = get().activeRoomId;
      const approvedRooms = rooms.filter((room) => room.status === 'approved');
      const activeRoomId = approvedRooms.some((room) => room.roomId === savedId)
        ? savedId
        : approvedRooms[0]?.roomId || null;
      if (activeRoomId) localStorage.setItem('syncatch-active-team-room', activeRoomId);
      else localStorage.removeItem('syncatch-active-team-room');
      set({ rooms, activeRoomId, loading: false, hydrated: true });
    } catch (error) {
      const message = getErrorMessage(error, 'Could not load team rooms');
      console.error('Team rooms: hydrate failed', error);
      set({ error: message, loading: false, hydrated: true });
    }
  },

  createRoom: async (name) => {
    set({ loading: true, error: null });
    try {
      const client = await getAuthenticatedClient();
      const { data, error } = await client.rpc('create_team_room', { room_name: name.trim() });
      if (error) throw error;
      const room = mapRoom({ ...((data as RpcRow[])[0]), pending_count: 0 });
      localStorage.setItem('syncatch-active-team-room', room.roomId);
      set((state) => ({ rooms: [room, ...state.rooms], activeRoomId: room.roomId, loading: false }));
      return room;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not create room');
      console.error('Team rooms: create failed', error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  requestAccess: async (code) => {
    set({ loading: true, error: null });
    try {
      const client = await getAuthenticatedClient();
      const { data, error } = await client.rpc('request_team_room_access', { code: code.trim() });
      if (error) throw error;
      const room = mapRoom({ ...((data as RpcRow[])[0]), invite_code: null, pending_count: 0 });
      set((state) => ({ rooms: [room, ...state.rooms.filter((item) => item.roomId !== room.roomId)], loading: false }));
      return room;
    } catch (error) {
      const message = getErrorMessage(error, 'Could not request access');
      console.error('Team rooms: access request failed', error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  selectRoom: (roomId) => {
    const room = get().rooms.find((item) => item.roomId === roomId);
    if (!room || room.status !== 'approved') return;
    localStorage.setItem('syncatch-active-team-room', roomId);
    set({ activeRoomId: roomId, members: [] });
  },

  loadMembers: async (roomId) => {
    set({ membersLoading: true, error: null });
    try {
      const client = await getAuthenticatedClient();
      const { data, error } = await client.rpc('get_team_room_members', { target_room: roomId });
      if (error) throw error;
      const members = ((data || []) as RpcRow[]).map((row) => ({
        membershipId: String(row.membership_id), userId: String(row.user_id),
        displayName: String(row.display_name || ''), email: String(row.email || ''),
        role: String(row.role) as RoomRole, status: String(row.status) as RoomMembershipStatus,
        requestedAt: String(row.requested_at),
      }));
      set({ members, membersLoading: false });
    } catch (error) {
      const message = getErrorMessage(error, 'Could not load members');
      console.error('Team rooms: member load failed', error);
      set({ error: message, membersLoading: false });
    }
  },

  reviewMember: async (membershipId, decision) => {
    const client = await getAuthenticatedClient();
    const { error } = await client.rpc('review_team_room_member', {
      target_membership: membershipId, decision,
    });
    if (error) throw error;
    const roomId = get().activeRoomId;
    if (roomId) {
      await Promise.all([get().loadMembers(roomId), get().hydrate()]);
    }
  },

  regenerateCode: async (roomId) => {
    const client = await getAuthenticatedClient();
    const { data, error } = await client.rpc('regenerate_team_room_code', { target_room: roomId });
    if (error) throw error;
    const code = String(data);
    set((state) => ({ rooms: state.rooms.map((room) => room.roomId === roomId ? { ...room, inviteCode: code } : room) }));
    return code;
  },

  clearError: () => set({ error: null }),
  reset: () => {
    localStorage.removeItem('syncatch-active-team-room');
    set({ rooms: [], activeRoomId: null, members: [], loading: false, error: null, hydrated: false });
  },
}));

export const getActiveTeamRoom = (state: TeamRoomState) =>
  state.rooms.find((room) => room.roomId === state.activeRoomId && room.status === 'approved') || null;
