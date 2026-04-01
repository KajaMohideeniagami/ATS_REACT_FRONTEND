import React, { useState, useEffect, useCallback } from 'react';

// ─── Toast Styles ───────────────────────────────────────────────────────────
const styles = `
  @keyframes slideIn {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }

  @keyframes shrink {
    from { width: 100%; }
    to   { width: 0%; }
  }

  .toast-wrapper {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    pointer-events: none;
  }

  .toast {
    pointer-events: all;
    background: #0a0a0a;
    color: #ffffff;
    border-radius: 10px;
    padding: 14px 20px;
    min-width: 280px;
    max-width: 420px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.08),
      0 8px 32px rgba(0,0,0,0.5),
      0 2px 8px rgba(0,0,0,0.3);
    animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    position: relative;
    overflow: hidden;
  }

  .toast.removing {
    animation: slideOut 0.25s ease-in forwards;
  }

  .toast-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
  }

  .toast-icon.success { background: #22c55e; color: #000; }
  .toast-icon.error   { background: #ef4444; color: #fff; }
  .toast-icon.warning { background: #f59e0b; color: #000; }
  .toast-icon.info    { background: #3b82f6; color: #fff; }

  .toast-message {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1.4;
    flex: 1;
    letter-spacing: -0.1px;
  }

  .toast-close {
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 4px;
    flex-shrink: 0;
    transition: color 0.15s ease;
  }

  .toast-close:hover {
    color: rgba(255,255,255,0.9);
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: rgba(255,255,255,0.25);
    border-radius: 0 0 10px 10px;
    animation: shrink linear forwards;
  }

  .toast-progress.success { background: #22c55e; }
  .toast-progress.error   { background: #ef4444; }
  .toast-progress.warning { background: #f59e0b; }
  .toast-progress.info    { background: #3b82f6; }
`;

// ─── Icons ───────────────────────────────────────────────────────────────────
const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '!',
  info:    'i',
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
const ToastItem = ({ id, message, type = 'info', duration = 3500, onRemove }) => {
  const [removing, setRemoving] = useState(false);

  const dismiss = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove(id), 250);
  }, [id, onRemove]);

  useEffect(() => {
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [dismiss, duration]);

  return (
    <div className={`toast ${removing ? 'removing' : ''}`}>
      <span className={`toast-icon ${type}`}>{ICONS[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={dismiss}>×</button>
      <div
        className={`toast-progress ${type}`}
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────
let globalAddToast = null;

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  return (
    <>
      <style>{styles}</style>
      <div className="toast-wrapper">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            {...toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </>
  );
};

// ─── Toast Helper (call anywhere) ────────────────────────────────────────────
export const toast = {
  success: (message, duration) => globalAddToast?.(message, 'success', duration),
  error:   (message, duration) => globalAddToast?.(message, 'error',   duration),
  warning: (message, duration) => globalAddToast?.(message, 'warning', duration),
  info:    (message, duration) => globalAddToast?.(message, 'info',    duration),
};

export default ToastContainer;
