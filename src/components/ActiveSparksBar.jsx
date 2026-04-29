import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QI_SPARK_BY_ID, SPARK_RARITY } from '../data/qiSparks';

// Unique id used to identify this modal in the mai:modal-opened broadcast.
const MODAL_ID = 'active-sparks';

/**
 * ActiveSparksBar — single chip in the home top-left chip stack matching
 * the visual language of the other status chips (rewards, idle, pills).
 * Tapping it opens a modal listing every active Qi Spark with its bonus.
 * Updates once per second to keep timed-spark countdowns ticking.
 *
 * Modal is rendered via createPortal so it escapes the home-screen stacking
 * context (position:fixed; z-index:1) and sits at document.body level.
 */
// Returns a non-timer suffix for permanent/event/mechanic sparks.
// Timed sparks (expiresAt set) are handled by the dedicated timer column.
function formatSuffix(card, instance) {
  if (instance.breakthroughsRemaining != null) return `${instance.breakthroughsRemaining}×`;
  if (card.kind === 'next_breakthrough_flag') return 'next';
  if (card.kind === 'permanent') return (instance.stacks ?? 1) > 1 ? `×${instance.stacks}` : '';
  if (card.kind === 'mechanic') return `T${card.tier}`;
  return '';
}

function ActiveSparksBar({ activeSparks }) {
  const [, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);

  // Tick every 250ms — drives chip countdown + modal row countdowns.
  // Faster than 1 s so the expiry fade-out animation triggers before
  // the parent removes the spark from state (cleanup runs every 1 s).
  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [activeSparks?.length]);

  // Auto-close when no sparks remain
  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) setOpen(false);
  }, [activeSparks?.length]);

  // Escape key
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close self whenever a DIFFERENT modal announces itself
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.id !== MODAL_ID) setOpen(false);
    };
    window.addEventListener('mai:modal-opened', handler);
    return () => window.removeEventListener('mai:modal-opened', handler);
  }, []);

  if (!activeSparks || activeSparks.length === 0) return null;

  const count = activeSparks.length;
  const now   = Date.now();

  // Soonest-expiring timed spark → shown as countdown on the chip itself
  const timedSparks   = activeSparks.filter(s => s.expiresAt);
  const soonestExpiry = timedSparks.length > 0
    ? Math.min(...timedSparks.map(s => s.expiresAt))
    : null;
  const chipTimer = soonestExpiry !== null
    ? Math.max(0, Math.ceil((soonestExpiry - now) / 1000))
    : null;

  const handleOpen = () => {
    // Broadcast so other modals close themselves
    window.dispatchEvent(new CustomEvent('mai:modal-opened', { detail: { id: MODAL_ID } }));
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className={`home-sparks-chip${chipTimer !== null && chipTimer <= 10 ? ' home-sparks-chip-urgent' : ''}`}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="View active Qi Sparks"
      >
        <span className="home-sparks-chip-icon">✦</span>
        <span className="home-sparks-chip-label">
          {count} {count === 1 ? 'Spark' : 'Sparks'}
        </span>
        {chipTimer !== null && (
          <span className="home-sparks-chip-timer">{chipTimer}s</span>
        )}
      </button>

      {open && createPortal(
        <div
          className="modal-overlay active-sparks-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Active Qi Sparks"
          onClick={() => setOpen(false)}
        >
          <div className="active-sparks-panel" onClick={(e) => e.stopPropagation()}>
            <header className="active-sparks-panel-header">
              <span className="active-sparks-panel-title">Active Qi Sparks</span>
              <span className="active-sparks-panel-count">{count}</span>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </header>

            <ul className="active-sparks-panel-list">
              {activeSparks.map((s) => {
                const card   = QI_SPARK_BY_ID[s.sparkId];
                if (!card) return null;
                const rarity      = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
                const remainingMs = s.expiresAt ? s.expiresAt - now : null;
                const isTimed     = remainingMs !== null;
                const isExpiring  = isTimed && remainingMs <= 0;
                const isUrgent    = isTimed && remainingMs > 0 && remainingMs < 10_000;
                // Non-timer suffix (stacks ×N, breakthrough count, tier label)
                const suffix      = !isTimed ? formatSuffix(card, s) : null;
                // Progress 0→1; original duration from card definition
                const totalMs     = card.duration ?? null;
                const progress    = (isTimed && totalMs)
                  ? Math.max(0, Math.min(1, remainingMs / totalMs))
                  : null;
                const secsLeft    = isTimed
                  ? Math.max(0, Math.ceil(remainingMs / 1000))
                  : null;

                return (
                  <li
                    key={s.instanceId}
                    className={`active-spark-row${isUrgent ? ' active-spark-row-urgent' : ''}${isExpiring ? ' active-spark-row-expiring' : ''}`}
                    style={{ '--rarity-color': rarity.color }}
                  >
                    <span
                      className="active-spark-row-dot"
                      style={{ background: rarity.color }}
                      aria-hidden="true"
                    />
                    <div className="active-spark-row-body">
                      <div className="active-spark-row-top">
                        <span className="active-spark-row-name">{card.name}</span>
                        {suffix && (
                          <span className="active-spark-row-suffix">{suffix}</span>
                        )}
                      </div>
                      <div className="active-spark-row-desc">{card.description}</div>
                    </div>

                    {/* Countdown timer column — only for timed sparks */}
                    {isTimed && (
                      <div className="active-spark-timer" aria-label={`${secsLeft}s remaining`}>
                        <span className="active-spark-timer-val">{secsLeft}s</span>
                        {progress !== null && (
                          <div className="active-spark-timer-bar">
                            <div
                              className="active-spark-timer-fill"
                              style={{ '--spark-progress': progress }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default ActiveSparksBar;
