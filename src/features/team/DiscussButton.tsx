import { MessageSquarePlus } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { ChatRef } from './team-types';

/**
 * Hands an item to the project chat composer. The hub watches `chatDraftRef`
 * and switches to the Chat tab with the item already attached.
 */
export function DiscussButton({ item, className = '' }: { item: ChatRef; className?: string }) {
  const startChatDraft = useTeamStore((s) => s.startChatDraft);

  return (
    <button
      type="button"
      title={`Discuss "${item.label}" in chat`}
      aria-label={`Discuss ${item.label} in chat`}
      onClick={(event) => {
        event.stopPropagation();
        startChatDraft(item);
      }}
      className={`rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent/10 hover:text-accent ${className}`}
    >
      <MessageSquarePlus className="h-3.5 w-3.5" />
    </button>
  );
}
