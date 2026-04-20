import { useEffect } from 'react';

const MAX_VISIBLE      = 3;
const DEFAULT_DURATION = 4000;

function ToastStack({ toasts, onDismiss, onNavigate }) {
  if (!toasts.length) return null;

  const visible  = toasts.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, toasts.length - MAX_VISIBLE);
  const top      = visible[0];

  // Auto-dismiss the top toast after its duration. Resets on each new top toast.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const ms = top.duration ?? DEFAULT_DURATION;
    const timer = setTimeout(() => onDismiss(top.id), ms);
    return () => clearTimeout(timer);
  }, [top.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNavigate() {
    if (top.targetScreen) onNavigate(top.targetScreen, top.targetParam ?? null);
    onDismiss(top.id);
  }

  return (
    <div className="toast-stack">
      <div className="toast-stage">

        {/* Peek cards — absolute, rendered before top so z-index wins */}
        {visible.slice(1).map((toast, i) => {
          const depth = i + 1;
          return (
            <div
              key={toast.id}
              className="toast-card toast-peek"
              style={{
                position: 'absolute',
                top:     `${depth * 6}px`,
                left:    `${depth * 5}px`,
                right:   `${depth * 5}px`,
                zIndex:  MAX_VISIBLE - depth,
                opacity: 1 - depth * 0.2,
              }}
            >
              <span className="toast-message">{toast.message}</span>
            </div>
          );
        })}

        {/* Top card — in flow, defines stage height, highest z-index */}
        <div className="toast-card toast-card-top">
          <span className="toast-message">{top.message}</span>
          <div className="toast-actions">
            {top.targetScreen && (
              <button className="toast-go" onClick={handleNavigate}>
                View →
              </button>
            )}
            <button
              className="toast-dismiss"
              onClick={() => onDismiss(top.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>

        {overflow > 0 && (
          <div className="toast-overflow">+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

export default ToastStack;
