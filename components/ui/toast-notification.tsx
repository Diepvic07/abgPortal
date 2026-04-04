'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastNotification({ toasts, onDismiss }: ToastNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isError = toast.type === 'error';

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all duration-200 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      } ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}
    >
      {isError ? (
        <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 200); }} className="ml-1 shrink-0 opacity-60 hover:opacity-100">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Hook: returns [toasts, showToast, dismissToast] */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: 'success' | 'error' = 'error') => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast: show, dismissToast: dismiss } as const;
}
