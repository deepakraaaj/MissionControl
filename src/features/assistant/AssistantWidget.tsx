import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import { useAssistantStore } from './assistant-store';
import { ChatPanel } from './ChatPanel';

// Floating assistant button + popover chat, available on every screen.
export function AssistantWidget() {
  const open = useAssistantStore((s) => s.open);
  const toggle = useAssistantStore((s) => s.toggle);
  const setOpen = useAssistantStore((s) => s.setOpen);

  return createPortal(
    <>
      {/* Launcher button — hidden whenever the panel is open. The panel's own
          header ✕ handles closing; leaving this floating on top of the panel
          would overlap its bottom-right corner and act as a redundant,
          badly-placed second close button. */}
      {!open && (
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-accent/50 bg-accent text-[rgb(var(--accent-contrast))] shadow-[0_10px_32px_rgb(var(--shadow-color)/0.32),0_0_0_4px_rgb(var(--surface-1)/0.75)] transition-transform hover:scale-105 active:scale-95 lg:bottom-6"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
        </button>
      )}

      {/* Popover panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[68] bg-black/20 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 right-0 left-0 z-[69] flex h-[80vh] flex-col overflow-hidden rounded-t-[28px] border border-borderSoft/30 bg-panel shadow-panel sm:bottom-24 sm:left-auto sm:right-5 sm:h-[560px] sm:w-[400px] sm:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-borderSoft/25 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-text-primary">Assistant</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted/70 transition-colors hover:bg-text-primary/8 hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel compact />
            </div>
          </div>
        </>
      )}
    </>,
    document.body,
  );
}
