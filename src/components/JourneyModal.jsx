import { useEffect, useRef } from 'react';
import REALMS from '../data/realms';

const REALM_ICONS = {
  'Tempered Body':          '💪',
  'Qi Transformation':      '✨',
  'True Element':           '⚡',
  'Separation & Reunion':   '☯️',
  'Immortal Ascension':     '☁️',
  'Saint':                  '⭐',
  'Saint King':             '👑',
  'Origin Returning':       '🔄',
  'Origin King':            '🏯',
  'Void King':              '🌌',
  'Dao Source':             '🌊',
  'Emperor Realm':          '🔱',
  'Half-Step Open Heaven':  '🌅',
  'Open Heaven':            '🌟',
};

function fmtQi(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(n);
}

// Group consecutive realm entries by name.
function groupRealms(realms) {
  const groups = [];
  let current = null;
  realms.forEach((r, idx) => {
    if (!current || current.name !== r.name) {
      current = { name: r.name, entries: [] };
      groups.push(current);
    }
    current.entries.push({ ...r, index: idx });
  });
  return groups;
}

const GROUPS = groupRealms(REALMS);

function JourneyModal({ realmIndex, onClose }) {
  const currentRef = useRef(null);
  const listRef    = useRef(null);

  useEffect(() => {
    if (currentRef.current && listRef.current) {
      currentRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="journey-modal" onClick={e => e.stopPropagation()}>
        <div className="journey-header">
          <span className="journey-title">🗺️ Cultivation Journey</span>
          <div className="journey-progress-label">
            {realmIndex + 1} / {REALMS.length} stages
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="journey-progress-bar">
          <div
            className="journey-progress-fill"
            style={{ width: `${((realmIndex + 1) / REALMS.length) * 100}%` }}
          />
        </div>

        <div className="journey-list" ref={listRef}>
          {GROUPS.map((group) => {
            const groupPast    = group.entries.every(e => e.index < realmIndex);
            const groupCurrent = group.entries.some(e => e.index === realmIndex);
            const groupFuture  = group.entries.every(e => e.index > realmIndex);

            return (
              <div
                key={group.name}
                className={`journey-group${groupPast ? ' jg-past' : ''}${groupCurrent ? ' jg-current' : ''}${groupFuture ? ' jg-future' : ''}`}
              >
                <div className="journey-group-header">
                  <span className="journey-group-icon">
                    {REALM_ICONS[group.name] ?? '•'}
                  </span>
                  <span className="journey-group-name">{group.name}</span>
                  {groupPast && <span className="journey-group-done">✓</span>}
                </div>

                <div className="journey-stages">
                  {group.entries.map((entry) => {
                    const isCurrent = entry.index === realmIndex;
                    const isPast    = entry.index < realmIndex;
                    const cls = `journey-stage${isCurrent ? ' js-current' : ''}${isPast ? ' js-past' : ''}`;

                    return (
                      <div
                        key={entry.index}
                        className={cls}
                        ref={isCurrent ? currentRef : null}
                      >
                        <div className="js-dot">
                          {isPast  && <span className="js-dot-check">✓</span>}
                          {isCurrent && <span className="js-dot-pulse" />}
                        </div>
                        <div className="js-body">
                          <span className="js-label">
                            {entry.stage || entry.name}
                          </span>
                          <span className="js-cost">{fmtQi(entry.cost)} Qi</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default JourneyModal;
