import { useTeamStore } from './team-store';
import { showToast } from '../toasts/toast-store';

/**
 * Raises a toast when a teammate posts in a project channel.
 *
 * Two things it deliberately stays quiet about: the channel you already have
 * open (unless you were @mentioned), and system activity rows, which every
 * task move would otherwise fire.
 */

/** Anything older than this is history, not news — room sync replays the log. */
const FRESH_WINDOW_MS = 2 * 60 * 1000;
/** Past this many at once, summarise instead of stacking toasts. */
const SUMMARY_THRESHOLD = 3;

let stop: (() => void) | null = null;

export function startChatNotifications(): () => void {
  if (stop) return stop;

  const seen = new Set(useTeamStore.getState().chatMessages.map((m) => m.id));

  const unsubscribe = useTeamStore.subscribe((state, previous) => {
    if (state.chatMessages === previous.chatMessages) return;

    const me = state.activePersona.name;
    const fresh = state.chatMessages.filter((m) => !seen.has(m.id));
    fresh.forEach((m) => seen.add(m.id));

    const notifiable = fresh.filter(
      (m) =>
        m.kind === 'message' &&
        m.authorName !== me &&
        Date.now() - new Date(m.createdAt).getTime() < FRESH_WINDOW_MS &&
        (m.mentions.includes(me) || state.activeChatChannel !== m.missionId),
    );

    if (notifiable.length === 0) return;

    const projectName = (missionId: string) =>
      state.teamMissions.find((mission) => mission.id === missionId)?.title ?? 'Project';

    if (notifiable.length > SUMMARY_THRESHOLD) {
      const authors = Array.from(new Set(notifiable.map((m) => m.authorName)));
      showToast({
        title: `${notifiable.length} new messages`,
        description: authors.join(', '),
        tone: 'info',
      });
      return;
    }

    notifiable.forEach((message) => {
      const mentioned = message.mentions.includes(me);
      const preview =
        message.body.trim() ||
        (message.refs.length === 1 ? `Shared ${message.refs[0].label}` : `Shared ${message.refs.length} items`);

      showToast({
        title: mentioned
          ? `${message.authorName} mentioned you`
          : `${message.authorName} · ${projectName(message.missionId)}`,
        description: preview.length > 120 ? `${preview.slice(0, 119)}…` : preview,
        tone: 'info',
        durationMs: mentioned ? 8000 : 5000,
      });
    });
  });

  stop = () => {
    unsubscribe();
    stop = null;
  };
  return stop;
}
