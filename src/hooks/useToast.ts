import { useCallback, useRef, useState } from 'react';
import type { ToastItem, ToastKind } from '../modules/shared/Toast';

/** Small global toast queue hook. */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev.slice(-4), { id, kind, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => push('success', msg), [push]);
  const error = useCallback((msg: string) => push('error', msg), [push]);
  const warning = useCallback((msg: string) => push('warning', msg), [push]);

  return { toasts, dismiss, success, error, warning };
}
