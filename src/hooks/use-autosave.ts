import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const defaultIsEqual = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Debounced autosave: watches `data`, and once it stops changing for `delay`
 * ms, persists it via `onSave`. Exposes the save lifecycle as `status` so the
 * UI can surface it, and `flush` for an immediate save (e.g. explicit save
 * button). Pending unsaved changes are flushed on unmount so closing an
 * editor never loses work.
 */
export function useAutoSave<T>({
  data,
  enabled,
  onSave,
  delay = 1200,
  isEqual = defaultIsEqual,
}: {
  data: T;
  enabled: boolean;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  isEqual?: (a: T, b: T) => boolean;
}) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');

  const lastSavedRef = useRef<T>(data);
  const dataRef = useRef<T>(data);
  const enabledRef = useRef(enabled);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const isEqualRef = useRef(isEqual);
  const delayRef = useRef(delay);
  dataRef.current = data;
  enabledRef.current = enabled;
  onSaveRef.current = onSave;
  isEqualRef.current = isEqual;
  delayRef.current = delay;

  const runSave = useCallback(async () => {
    if (savingRef.current) return;
    const snapshot = dataRef.current;
    if (isEqualRef.current(snapshot, lastSavedRef.current)) return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await onSaveRef.current(snapshot);
      lastSavedRef.current = snapshot;
      savingRef.current = false;
      if (isEqualRef.current(dataRef.current, snapshot)) {
        setStatus('saved');
      } else {
        // Data moved on while the save was in flight; go around again.
        setStatus('dirty');
        timerRef.current = setTimeout(() => void runSave(), delayRef.current);
      }
    } catch {
      savingRef.current = false;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (isEqual(data, lastSavedRef.current)) return;
    setStatus('dirty');
    timerRef.current = setTimeout(() => void runSave(), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled, delay, runSave]);

  // Flush pending changes when the consumer unmounts (editor closed mid-edit).
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (enabledRef.current && !savingRef.current && !isEqualRef.current(dataRef.current, lastSavedRef.current)) {
        void onSaveRef.current(dataRef.current);
        lastSavedRef.current = dataRef.current;
      }
    },
    [],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await runSave();
  }, [runSave]);

  return { status, flush };
}
