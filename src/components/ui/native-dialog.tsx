import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

type DialogRequest = {
  kind: 'confirm' | 'prompt';
  title: string;
  message: string;
  initialValue?: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (value: boolean | string | null) => void;
};

let activeRequest: DialogRequest | null = null;
const listeners = new Set<(request: DialogRequest | null) => void>();
const publish = () => listeners.forEach((listener) => listener(activeRequest));

const openDialog = (request: DialogRequest) => {
  if (activeRequest) activeRequest.resolve(activeRequest.kind === 'confirm' ? false : null);
  activeRequest = request;
  publish();
};

export const confirmDialog = (message: string, options?: { title?: string; confirmLabel?: string; danger?: boolean }) =>
  new Promise<boolean>((resolve) => openDialog({ kind: 'confirm', title: options?.title ?? 'Confirm action', message, confirmLabel: options?.confirmLabel ?? 'Confirm', danger: options?.danger, resolve: (value) => resolve(value === true) }));

export const promptDialog = (message: string, initialValue = '', options?: { title?: string; confirmLabel?: string }) =>
  new Promise<string | null>((resolve) => openDialog({ kind: 'prompt', title: options?.title ?? 'Add details', message, initialValue, confirmLabel: options?.confirmLabel ?? 'Save', resolve: (value) => resolve(typeof value === 'string' ? value : null) }));

export function NativeDialogHost() {
  const [request, setRequest] = useState<DialogRequest | null>(activeRequest);
  const [value, setValue] = useState('');
  useEffect(() => {
    const listener = (next: DialogRequest | null) => { setRequest(next); setValue(next?.initialValue ?? ''); };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close(request.kind === 'confirm' ? false : null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [request]);

  const close = (result: boolean | string | null) => {
    const current = activeRequest;
    activeRequest = null;
    publish();
    current?.resolve(result);
  };
  if (!request) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="native-dialog-title">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={() => close(request.kind === 'confirm' ? false : null)} aria-label="Close dialog" />
      <form onSubmit={(event) => { event.preventDefault(); close(request.kind === 'prompt' ? value : true); }} className="relative w-full max-w-md rounded-[24px] border border-borderSoft bg-panel p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 sm:p-6">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${request.danger ? 'bg-danger/12 text-danger' : 'bg-accent/12 text-accent'}`}>{request.danger ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}</div>
          <div className="min-w-0 flex-1"><h2 id="native-dialog-title" className="text-base font-bold text-text-primary">{request.title}</h2><p className="mt-1 text-sm leading-5 text-text-secondary">{request.message}</p></div>
          <button type="button" onClick={() => close(request.kind === 'confirm' ? false : null)} className="rounded-lg p-1.5 text-text-muted hover:bg-panel2 hover:text-text-primary" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {request.kind === 'prompt' ? <textarea autoFocus rows={3} value={value} onChange={(event) => setValue(event.target.value)} className="mt-4 w-full resize-y rounded-xl border border-borderSoft bg-panel2/60 px-3 py-2.5 text-sm leading-5 text-text-primary outline-none focus:border-accent" /> : null}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => close(request.kind === 'confirm' ? false : null)} className="h-10 rounded-xl px-4 text-sm font-semibold text-text-secondary hover:bg-panel2">Cancel</button><button type="submit" className={`h-10 rounded-xl px-4 text-sm font-bold text-white ${request.danger ? 'bg-danger' : 'bg-accent text-[rgb(var(--accent-contrast))]'}`}>{request.confirmLabel}</button></div>
      </form>
    </div>, document.body,
  );
}
