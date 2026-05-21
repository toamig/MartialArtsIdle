import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QI_SPARK_BY_ID, SPARK_COPY } from '../data/qiSparks';

const BASE = import.meta.env.BASE_URL;
const MODAL_ID = 'active-sparks';

/**
 * ActiveSparksBar — top-left chip on the Home screen showing TIMED buffs
 * (sparks with an `expiresAt`). Hidden entirely when no timed sparks are
 * active — permanent / legendary / mechanic sparks live in the
 * Cultivation > Sparks tab now (canonical "build view"), not on the home
 * chip. The chip's job is to surface time-pressure: how long do I still
 * benefit from this buff.
 *
 * Popover (on tap) shows the active timed sparks each with:
 *   - icon (sprite for legendary timed cards in the future, emoji for the
 *     existing common-tier timed buffs)
 *   - name
 *   - countdown bar (fills 1→0 as expiry approaches)
 *   - seconds remaining
 *
 * Bottom link: "View all sparks →" dispatches `mai:nav-sparks` which
 * App.jsx catches and navigates to Cultivation > Sparks for the canonical
 * full view (permanent + legendary + mechanic + timed).
 */
function CardIcon({ icon, fallback = '✦' }) {
  const ic = icon ?? fallback;
  if (typeof ic === 'string' && ic.startsWith('/')) {
    return <img className="asb-row-icon-img" src={`${BASE}${ic.replace(/^\//, '')}`} alt="" draggable={false} />;
  }
  return <span className="asb-row-icon-emoji" aria-hidden="true">{ic}</span>;
}

function ActiveSparksBar({ activeSparks }) {
  const [, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);

  // Tick every 250ms — drives chip countdown + popover bar/countdown.
  useEffect(() => {
    if (!activeSparks || activeSparks.length === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [activeSparks?.length]);

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close when a different modal opens
  useEffect(() => {
    const handler = (e) => { if (e.detail?.id !== MODAL_ID) setOpen(false); };
    window.addEventListener('mai:modal-opened', handler);
    return () => window.removeEventListener('mai:modal-opened', handler);
  }, []);

  // ── Filter to TIMED sparks only — the chip's reason for existing ────
  const now = Date.now();
  const timedSparks = (activeSparks ?? []).filter(s => s.expiresAt && s.expiresAt > now);

  // Auto-close popover when last timed spark expires
  useEffect(() => {
    if (timedSparks.length === 0) setOpen(false);
  }, [timedSparks.length]);

  if (timedSparks.length === 0) return null;

  // Soonest-expiring timer for the chip label
  const soonestExpiry = Math.min(...timedSparks.map(s => s.expiresAt));
  const chipTimer = Math.max(0, Math.ceil((soonestExpiry - now) / 1000));
  const count = timedSparks.length;

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('mai:modal-opened', { detail: { id: MODAL_ID } }));
    setOpen(true);
  };

  const handleViewAll = () => {
    setOpen(false);
    // App.jsx listens and routes to Cultivation > Sparks tab.
    try {
      window.dispatchEvent(new CustomEvent('mai:nav-sparks'));
    } catch {}
  };

  return (
    <>
      <button
        type="button"
        className={`home-sparks-chip${chipTimer <= 10 ? ' home-sparks-chip-urgent' : ''}`}
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Active buffs"
      >
        <span className="home-sparks-chip-icon">✦</span>
        <span className="home-sparks-chip-label">
          {count} {count === 1 ? 'Buff' : 'Buffs'}
        </span>
        <span className="home-sparks-chip-timer">{chipTimer}s</span>
      </button>

      {open && createPortal(
        <div
          className="modal-overlay asb-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Active timed buffs"
          onClick={() => setOpen(false)}
        >
          <div className="asb-popover" onClick={(e) => e.stopPropagation()}>
            <header className="asb-popover-header">
              <span className="asb-popover-title">Active buffs</span>
              <span className="asb-popover-count">{count}</span>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >✕</button>
            </header>

            <ul className="asb-popover-list">
              {timedSparks
                .slice()
                .sort((a, b) => a.expiresAt - b.expiresAt) // soonest first
                .map((s) => {
                  const card = QI_SPARK_BY_ID[s.sparkId];
                  if (!card) return null;
                  const copy = SPARK_COPY[s.sparkId];
                  const remainingMs = Math.max(0, s.expiresAt - now);
                  const totalMs    = card.duration ?? 1;
                  const progress   = Math.max(0, Math.min(1, remainingMs / totalMs));
                  const secsLeft   = Math.max(0, Math.ceil(remainingMs / 1000));
                  const isUrgent   = secsLeft < 10;
                  return (
                    <li
                      key={s.instanceId}
                      className={`asb-row${isUrgent ? ' asb-row-urgent' : ''} asb-row-${card.rarity}`}
                    >
                      <div className="asb-row-icon">
                        <CardIcon icon={copy?.icon} />
                      </div>
                      <div className="asb-row-body">
                        <div className="asb-row-name">{card.name}</div>
                        <div className="asb-row-bar">
                          <div className="asb-row-bar-fill" style={{ '--p': progress }} />
                        </div>
                      </div>
                      <div className="asb-row-timer">{secsLeft}s</div>
                    </li>
                  );
                })}
            </ul>

            <button
              type="button"
              className="asb-popover-link"
              onClick={handleViewAll}
            >
              View all sparks <span className="asb-arrow">→</span>
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default ActiveSparksBar;
