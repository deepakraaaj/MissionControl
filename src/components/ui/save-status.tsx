import { motion, AnimatePresence } from 'framer-motion';
import { Check, CloudOff } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { AutoSaveStatus } from '../../hooks/use-autosave';

const STATUS_META: Record<Exclude<AutoSaveStatus, 'idle'>, { label: string; className: string }> = {
  dirty: { label: 'Unsaved changes', className: 'text-text-muted/60' },
  saving: { label: 'Saving…', className: 'text-text-muted/70' },
  saved: { label: 'Saved', className: 'text-emerald-600/80 dark:text-emerald-400/80' },
  error: { label: "Couldn't save", className: 'text-danger/80' },
};

export function SaveStatus({ status, className }: { status: AutoSaveStatus; className?: string }) {
  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15 }}
          className={cn('flex items-center gap-1.5 text-[11px] font-medium', STATUS_META[status].className, className)}
        >
          {status === 'dirty' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current/60" />}
          {status === 'saving' && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="h-3 w-3 rounded-full border border-current/40 border-t-current"
            />
          )}
          {status === 'saved' && <Check className="h-3 w-3" />}
          {status === 'error' && <CloudOff className="h-3 w-3" />}
          {STATUS_META[status].label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
