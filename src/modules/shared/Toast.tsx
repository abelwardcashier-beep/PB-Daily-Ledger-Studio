import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

export type ToastKind = 'success' | 'error' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const KIND_STYLES: Record<ToastKind, { bar: string; icon: typeof CheckCircleIcon; text: string }> = {
  success: { bar: 'bg-emerald-500', icon: CheckCircleIcon, text: 'text-emerald-600' },
  error: { bar: 'bg-rose-500', icon: XCircleIcon, text: 'text-rose-600' },
  warning: { bar: 'bg-amber-500', icon: ExclamationTriangleIcon, text: 'text-amber-600' },
};

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const style = KIND_STYLES[toast.kind];
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3800);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 pr-9 shadow-md min-w-72 max-w-sm"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} aria-hidden />
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.text}`} />
      <p className="text-sm font-medium text-slate-700">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2 top-2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        aria-label="Dismiss notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
