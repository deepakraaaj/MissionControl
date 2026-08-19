import { useMemo } from 'react';
import { useTeamStore } from './team-store';

/** Messages in a project the current user has not seen yet. */
export function useUnreadCount(missionId: string) {
  const chatMessages = useTeamStore((s) => s.chatMessages);
  const lastRead = useTeamStore((s) => s.channelReads[missionId]);
  const me = useTeamStore((s) => s.activePersona.name);

  return useMemo(
    () =>
      chatMessages.filter(
        (m) => m.missionId === missionId && m.authorName !== me && (!lastRead || m.createdAt > lastRead),
      ).length,
    [chatMessages, lastRead, me, missionId],
  );
}
