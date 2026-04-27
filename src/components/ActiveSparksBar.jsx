import { useState, useEffect } from 'react';
import { QI_SPARK_BY_ID, SPARK_RARITY } from '../data/qiSparks';

/**
 * ActiveSparksBar — single chip in the home top-left chip stack matching
 * the visual language of the other status chips (rewards, idle, pills).
 * Tapping it opens a modal listing every active Qi Spark with its bonus.
 * Updates once per second to keep timed-spark countdowns ticking.
 */
function formatSuffix(card, instance) {
  if (instance.expiresAt) {
    const remainingMs = Math.max(0, instance.expiresAt - Date.now());
    return `${Math.ceil(remainingMs / 1000)}s`;
  }
  if (instance.breakthroughsRemaining != null) return `${instance.breakthroughsRemaining}×`;
  if (card.kind === 'next_breakthrough_flag') return 'next';
  if (card.kind === 'permanent') return (instance.stacks ?? 1) > 1 ? `×${instance.stacks}` : '';
  if (card.kind === 'mechanic') return `T${card.tier}`;
  return '';
}

function ActiveSparksBar({ activeSparks }) {
  const [, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSparks?.length]);

  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) setOpen(false);
  }, [activeSparks?.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!activeSparks || activeSparks.length === 0) return null;

  const count = activeSparks.length;

  return (
    <>
      <button
        type="button"
        className="home-sparks-chip"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="View active Qi Sparks"
      >
        <span className="home-sparks-chip-icon">✦</span>
        <span className="home-sparks-chip-label">
          {count} {count === 1 ? 'Spark' : 'Sparks'}
        </span>
      </button>

      {open && (
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
                const card = QI_SPARK_BY_ID[s.sparkId];
                if (!card) return null;
                const rarity = SPARK_RARITY[card.rarity] ?? SPARK_RARITY.common;
                const suffix = formatSuffix(card, s);

                return (
                  <li
                    key={s.instanceId}
                    className="active-spark-row"
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
                        {suffix && <span className="active-spark-row-suffix">{suffix}</span>}
                      </div>
                      <div className="active-spark-row-desc">{card.description}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default ActiveSparksBar;
