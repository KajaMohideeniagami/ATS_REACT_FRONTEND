import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const ToastContext = createContext(null);

const styles = `
  @keyframes toastSlideIn {
    from {
      transform: translate3d(0, 24px, 0) scale(0.96);
      opacity: 0;
    }
    to {
      transform: translate3d(0, 0, 0) scale(1);
      opacity: 1;
    }
  }

  @keyframes toastSlideOut {
    from {
      transform: translate3d(0, 0, 0) scale(1);
      opacity: 1;
    }
    to {
      transform: translate3d(0, 16px, 0) scale(0.98);
      opacity: 0;
    }
  }

  @keyframes toastProgress {
    from { width: 100%; }
    to { width: 0%; }
  }

  .toast-wrapper {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .toast {
    pointer-events: all;
    width: min(380px, calc(100vw - 32px));
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(9, 14, 24, 0.94);
    color: #ffffff;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: start;
    padding: 14px 14px 12px;
    box-shadow:
      0 18px 48px rgba(2, 8, 23, 0.35),
      0 4px 14px rgba(2, 8, 23, 0.22);
    animation: toastSlideIn 0.22s ease-out forwards;
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(14px);
  }

  .toast.removing {
    animation: toastSlideOut 0.2s ease-in forwards;
  }

  .toast-icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .toast.success .toast-icon { background: rgba(34, 197, 94, 0.18); color: #4ade80; }
  .toast.error .toast-icon { background: rgba(239, 68, 68, 0.18); color: #f87171; }
  .toast.warning .toast-icon { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
  .toast.info .toast-icon { background: rgba(59, 130, 246, 0.18); color: #60a5fa; }

  .toast-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toast-title {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: rgba(255,255,255,0.85);
  }

  .toast-message {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    color: #ffffff;
    word-break: break-word;
  }

  .toast-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgba(255,255,255,0.48);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .toast-close:hover {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.9);
  }

  .toast-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    border-radius: 0 0 16px 16px;
    animation: toastProgress linear forwards;
  }

  .toast.success .toast-progress { background: #22c55e; }
  .toast.error .toast-progress { background: #ef4444; }
  .toast.warning .toast-progress { background: #f59e0b; }
  .toast.info .toast-progress { background: #3b82f6; }

  @media (max-width: 768px) {
    .toast-wrapper {
      left: 16px;
      right: 16px;
      bottom: 16px;
    }

    .toast {
      width: 100%;
    }
  }
`;

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

const createToast = (message, type = 'info', duration = 3500) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  message,
  type,
  duration,
});

const ToastItem = ({ id, message, type, duration, onRemove }) => {
  const [removing, setRemoving] = useState(false);

  const dismiss = useCallback(() => {
    setRemoving(true);
    window.setTimeout(() => onRemove(id), 200);
  }, [id, onRemove]);

  useEffect(() => {
    const timeoutId = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timeoutId);
  }, [dismiss, duration]);

  return (
    <div className={`toast ${type} ${removing ? 'removing' : ''}`} role="status" aria-live="polite">
      <span className="toast-icon">{ICONS[type] || ICONS.info}</span>
      <div className="toast-content">
        <span className="toast-title">{TITLES[type] || TITLES.info}</span>
        <span className="toast-message">{message}</span>
      </div>
      <button type="button" className="toast-close" onClick={dismiss} aria-label="Dismiss notification">
        ×
      </button>
      <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

let globalApi = null;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const validationLockRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return null;
    const toastItem = createToast(message, type, duration);
    setToasts((current) => [...current, toastItem]);
    return toastItem.id;
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const notifyRequiredFields = useCallback((message = 'Please fill all required fields', lockKey = 'default') => {
    const now = Date.now();
    const lastShown = validationLockRef.current.get(lockKey) || 0;
    if (now - lastShown < 1200) {
      return null;
    }
    validationLockRef.current.set(lockKey, now);
    return push(message, 'warning', 2800);
  }, [push]);

  const contextValue = useMemo(() => ({
    show: push,
    success: (message, duration) => push(message, 'success', duration),
    error: (message, duration) => push(message, 'error', duration),
    warning: (message, duration) => push(message, 'warning', duration),
    info: (message, duration) => push(message, 'info', duration),
    notifyRequiredFields,
    dismissAll,
  }), [dismissAll, notifyRequiredFields, push]);

  useEffect(() => {
    globalApi = contextValue;
    return () => {
      globalApi = null;
    };
  }, [contextValue]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <style>{styles}</style>
      <div className="toast-wrapper">
        {toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} {...toastItem} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const toast = {
  show: (message, type = 'info', duration) => globalApi?.show(message, type, duration),
  success: (message, duration) => globalApi?.success(message, duration),
  error: (message, duration) => globalApi?.error(message, duration),
  warning: (message, duration) => globalApi?.warning(message, duration),
  info: (message, duration) => globalApi?.info(message, duration),
  requiredFields: (message, lockKey) => globalApi?.notifyRequiredFields(message, lockKey),
  dismissAll: () => globalApi?.dismissAll(),
};

export default ToastProvider;
