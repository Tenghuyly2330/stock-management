import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title, message, duration = 3500 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newToast = {
        id,
        type,
        title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notification'),
        message,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (message, title) => addToast({ type: 'success', message, title }),
      error: (message, title) => addToast({ type: 'error', message, title, duration: 4500 }),
      warning: (message, title) => addToast({ type: 'warning', message, title }),
      info: (message, title) => addToast({ type: 'info', message, title }),
      custom: addToast,
      dismiss: removeToast,
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Top-Right Toast Notification Container */}
      <aside aria-label="Notifications" className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let badgeStyles;
          let icon;

          if (t.type === 'success') {
            badgeStyles = 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10 shadow-lg';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
          } else if (t.type === 'error') {
            badgeStyles = 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-500/10 shadow-lg';
            icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />;
          } else if (t.type === 'warning') {
            badgeStyles = 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-500/10 shadow-lg';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
          } else {
            badgeStyles = 'bg-indigo-50/95 border-indigo-200 text-indigo-950 shadow-indigo-500/10 shadow-lg';
            icon = <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl border p-3.5 backdrop-blur-md transition-all duration-300 flex items-start gap-3 animate-in fade-in slide-in-from-top-3 ${badgeStyles}`}
              role="alert"
            >
              {icon}
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h5 className="text-xs font-bold leading-tight mb-0.5">
                    {t.title}
                  </h5>
                )}
                <p className="text-xs text-slate-700 leading-relaxed break-words font-medium">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

