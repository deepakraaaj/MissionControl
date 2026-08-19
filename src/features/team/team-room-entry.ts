import { useTeamRoomStore } from './team-room-store';
import { useTeamStore } from './team-store';
import { connectTeamRoomSync } from './team-room-sync';

/** Selects a room, connects its live sync, and unlocks the team workspace. */
export async function enterTeamRoom(roomId: string): Promise<void> {
  const state = useTeamRoomStore.getState();
  state.selectRoom(roomId);
  const room = state.rooms.find((item) => item.roomId === roomId);
  await connectTeamRoomSync(roomId, room?.name);
  useTeamStore.getState().grantApprovedTeamAccess();
}

/**
 * Opens the room the user was last in, so switching to Team goes straight to
 * work instead of through the picker. Falls back to the only approved room
 * when there is exactly one.
 *
 * @returns true when a room was opened; false means the picker is still needed.
 */
export async function resumeLastTeamRoom(): Promise<boolean> {
  if (!useTeamRoomStore.getState().hydrated) {
    await useTeamRoomStore.getState().hydrate();
  }

  const { rooms, activeRoomId } = useTeamRoomStore.getState();
  const approved = rooms.filter((room) => room.status === 'approved');
  if (approved.length === 0) return false;

  const remembered =
    approved.find((room) => room.roomId === activeRoomId) ?? (approved.length === 1 ? approved[0] : null);
  if (!remembered) return false;

  await enterTeamRoom(remembered.roomId);
  return true;
}
