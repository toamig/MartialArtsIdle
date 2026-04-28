import { useMemo, useState } from 'react';
import { ARTEFACTS_BY_ID, QUALITY } from '../data/artefacts';
import { formatArtefactName } from '../data/artefactNames';
import { ALL_MATERIALS, mineralForRarity } from '../data/materials';
import { formatAffixValue } from '../data/affixDisplay';
import {
  MAX_UPGRADE_BY_RARITY,
  effectiveAffixValue,
  isBonusLevel,
} from '../data/artefactUpgrades';

/**
 * ArtefactUpgradeModal — Genshin-style upgrade screen.
 *
 * Three stacked sections:
 *   1. Preview — current → next level + per-affix value delta.
 *   2. Cost — `have / need` rows for the two required materials.
 *   3. Feed — scrollable grid of sacrificeable artefacts. Tapping queues
 *      an artefact (non-destructive). Cost rows live-preview the queue's
 *      contribution as `have (+queued) / need`. Tapping a queued tile
 *      removes it from the queue. Closing the modal discards the queue.
 *
 * Commit happens only when the player taps Upgrade: queued artefacts are
 * dismantled in bulk (each yields 1× tier-1 mineral of matching rarity),
 * the cost is paid from inventory, and the level bumps. A confirm gate
 * appears at Upgrade time if the queue contains anything Silver+ or
 * already invested in (mirrors the existing dismantle-button heuristic).
 */

const RARITY_RANK = { Iron: 1, Bronze: 2, Silver: 3, Gold: 4, Transcendent: 5 };

function isValuableSacrifice(item) {
  return (RARITY_RANK[item.rarity] ?? 1) >= 3 || item.invested;
}

function ArtefactUpgradeModal({ artefact, artefacts, inventory, onClose }) {
  // Queued sacrifice uids (non-destructive until commit).
  const [queue, setQueue] = useState([]);
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);

  // Live snapshot — re-reads owned every render so removals/level-ups are reflected.
  const live = artefacts.owned.find(o => o.uid === artefact.uid) ?? artefact;
  const cat   = ARTEFACTS_BY_ID[live.catalogueId];
  const rarity = live.rarity ?? cat?.rarity ?? 'Iron';
  const q      = QUALITY[rarity] ?? { color: '#9ca3af', label: rarity };
  const level  = live.upgradeLevel ?? 0;
  const cap    = MAX_UPGRADE_BY_RARITY[rarity] ?? 0;
  const atCap  = level >= cap;
  const cost   = atCap ? null : (artefacts.getUpgradeCost?.(live.uid) ?? null);
  const name   = formatArtefactName(live) ?? cat?.name ?? 'Artefact';
  const slotLabel = cat?.slot ?? '';
  const nextLevel = level + 1;
  const milestone = !atCap && isBonusLevel(nextLevel);
  const affixes   = live.affixes ?? [];
  const affixBonuses = live.affixBonuses ?? {};

  // Set of cost item ids — used to filter the feed so we only surface
  // artefacts whose dismantle yield actually contributes to this upgrade.
  const costIds = useMemo(() => new Set((cost ?? []).map(c => c.itemId)), [cost]);

  // Owned artefacts the player can sacrifice: not the target, not equipped,
  // not locked by the player, AND whose dismantle yield is one of the cost
  // materials. Hides "useless" sacrifices so the player isn't tempted to
  // burn fodder for nothing.
  const sacrificeable = useMemo(() => {
    return artefacts.owned
      .filter(o => o.uid !== live.uid)
      .filter(o => !o.locked)
      .filter(o => !artefacts.equippedInSlot(o.uid))
      .map(o => {
        const c = ARTEFACTS_BY_ID[o.catalogueId];
        const r = o.rarity ?? c?.rarity ?? 'Iron';
        return {
          uid: o.uid,
          rarity: r,
          name: formatArtefactName(o) ?? c?.name ?? 'Artefact',
          slot: c?.slot,
          mineralId: mineralForRarity(r),
          invested: (o.upgradeLevel ?? 0) > 0 || (o.craftCount ?? 0) > 0,
        };
      })
      .filter(item => costIds.has(item.mineralId))
      .sort((a, b) => (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0));
  }, [artefacts, live.uid, costIds]);

  // Materialised queue (drops queued uids that are no longer sacrificeable —
  // defensive in case the owned list mutates outside this modal).
  const queuedItems = useMemo(() => {
    const byUid = new Map(sacrificeable.map(s => [s.uid, s]));
    return queue.map(uid => byUid.get(uid)).filter(Boolean);
  }, [queue, sacrificeable]);

  function queueContribution(itemId) {
    let n = 0;
    for (const it of queuedItems) if (it.mineralId === itemId) n += 1;
    return n;
  }

  function effectiveHave(itemId) {
    return inventory.getQuantity(itemId) + queueContribution(itemId);
  }

  const canAfford = !atCap && !!cost && cost.every(c => effectiveHave(c.itemId) >= c.qty);
  const valuableQueued = queuedItems.some(isValuableSacrifice);

  function toggleQueue(item) {
    setQueue(q => q.includes(item.uid) ? q.filter(u => u !== item.uid) : [...q, item.uid]);
  }

  function commitUpgrade() {
    // Dismantle queued artefacts first so their minerals appear in inventory
    // before the cost is debited.
    for (const item of queuedItems) {
      const r = artefacts.dismantleArtefact(item.uid);
      if (r) inventory.addItem(mineralForRarity(r), 1);
    }
    if (cost) {
      for (const c of cost) inventory.removeItem(c.itemId, c.qty);
    }
    artefacts.levelUpArtefact(live.uid);
    setQueue([]);
    setConfirmingUpgrade(false);
  }

  function onUpgrade() {
    if (atCap || !canAfford || !cost) return;
    if (queuedItems.length > 0 && valuableQueued) {
      setConfirmingUpgrade(true);
    } else {
      commitUpgrade();
    }
  }

  const upgradeLabel = atCap
    ? 'MAX'
    : !canAfford
      ? 'Not enough materials'
      : queuedItems.length > 0
        ? `Upgrade → +${nextLevel} · sacrifice ${queuedItems.length}`
        : `Upgrade → +${nextLevel}`;

  return (
    <div
      className="modal-overlay artefact-upgrade-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade artefact"
      onClick={onClose}
    >
      <div className="artefact-upgrade-panel" onClick={e => e.stopPropagation()}>
        <header className="artefact-upgrade-header">
          <span className="artefact-upgrade-gem" style={{ color: q.color }}>◆</span>
          <div className="artefact-upgrade-titles">
            <div className="artefact-upgrade-title" style={{ color: q.color }}>
              {name}
              {level > 0 && <span className="artefact-upgrade-curlevel"> +{level}</span>}
            </div>
            <div className="artefact-upgrade-subtitle">
              {q.label ?? rarity}{slotLabel && ` · ${slotLabel}`}
            </div>
          </div>
          <button
            type="button"
            className="modal-close artefact-upgrade-close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="artefact-upgrade-body">
          {/* ── Preview: level + per-affix value delta ─────────────────── */}
          <section className="artefact-upgrade-preview">
            <div className="artefact-upgrade-level-row">
              <span className="artefact-upgrade-level-label">Level</span>
              <span className="artefact-upgrade-level-current">+{level}</span>
              <span className="artefact-upgrade-level-arrow">→</span>
              <span
                className="artefact-upgrade-level-next"
                style={{ color: atCap ? '#9ca3af' : q.color }}
              >
                {atCap ? 'MAX' : `+${nextLevel}`}
              </span>
              <span className="artefact-upgrade-level-cap">/ +{cap}</span>
            </div>

            {!atCap && affixes.length > 0 && (
              <ul className="artefact-upgrade-stats">
                {affixes.map((a, i) => {
                  if (!a.stat && !a.flag) return null;
                  const entry   = affixBonuses[i];
                  const curEff  = effectiveAffixValue(a, level, entry);
                  const nextEff = effectiveAffixValue(a, nextLevel, entry);
                  const curLine  = formatAffixValue({ ...a, value: curEff });
                  const nextLine = formatAffixValue({ ...a, value: nextEff });
                  return (
                    <li key={i} className="artefact-upgrade-stat-row">
                      <span className="artefact-upgrade-stat-cur">{curLine}</span>
                      <span className="artefact-upgrade-stat-arrow">→</span>
                      <span className="artefact-upgrade-stat-next" style={{ color: q.color }}>
                        {nextLine}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {milestone && (
              <div className="artefact-upgrade-milestone">
                ✦ Bonus roll on one affix at +{nextLevel}
              </div>
            )}

            {atCap && (
              <div className="artefact-upgrade-maxed">Fully upgraded</div>
            )}
          </section>

          {/* ── Cost gate ── progress bars with live queue preview ────── */}
          {!atCap && cost && (
            <section className="artefact-upgrade-cost">
              <div className="artefact-upgrade-section-title">Cost</div>
              <ul className="artefact-upgrade-cost-list">
                {cost.map((c, i) => {
                  const have      = inventory.getQuantity(c.itemId);
                  const queued    = queueContribution(c.itemId);
                  const need      = c.qty;
                  const haveCap   = Math.min(have, need);
                  const totalCap  = Math.min(have + queued, need);
                  const havePct   = (haveCap   / need) * 100;
                  const queuedPct = ((totalCap - haveCap) / need) * 100;
                  const met       = have + queued >= need;
                  const matRec    = ALL_MATERIALS[c.itemId];
                  const matName   = matRec?.name ?? c.itemId;
                  const matCol    = matRec?.rarity ? (QUALITY[matRec.rarity]?.color ?? '#9ca3af') : '#9ca3af';
                  return (
                    <li key={i} className="artefact-upgrade-cost-row">
                      <div className="artefact-upgrade-cost-row-top">
                        <span className="artefact-upgrade-cost-gem" style={{ color: matCol }}>◆</span>
                        <span className="artefact-upgrade-cost-name">{matName}</span>
                        <span
                          className={`artefact-upgrade-cost-have ${met ? 'is-met' : 'is-short'}`}
                          title={queued > 0 ? `${have} owned + ${queued} from sacrifice queue` : `${have} owned`}
                        >
                          {have + queued} / {need} {met ? '✓' : ''}
                        </span>
                      </div>
                      <div className="artefact-upgrade-cost-bar" aria-hidden="true">
                        <span
                          className="artefact-upgrade-cost-bar-have"
                          style={{ width: `${havePct}%` }}
                        />
                        <span
                          className="artefact-upgrade-cost-bar-queued"
                          style={{ width: `${queuedPct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* ── Sacrifice feed ── only artefacts whose yield matches cost ── */}
          {!atCap && (
            <section className="artefact-upgrade-feed">
              <div className="artefact-upgrade-section-title">
                Sacrifice artefacts
                <span className="artefact-upgrade-section-hint"> · tap to queue</span>
              </div>

              {sacrificeable.length === 0 ? (
                <div className="artefact-upgrade-empty">
                  No sacrificeable artefacts yield this level&rsquo;s materials.
                </div>
              ) : (
                <div className="artefact-upgrade-feed-grid">
                  {sacrificeable.map(item => {
                    const itemQ = QUALITY[item.rarity] ?? { color: '#9ca3af' };
                    const yieldRec = ALL_MATERIALS[item.mineralId];
                    const yieldName = yieldRec?.name ?? item.mineralId;
                    const isQueued = queue.includes(item.uid);
                    return (
                      <button
                        type="button"
                        key={item.uid}
                        className={`artefact-upgrade-feed-tile${isQueued ? ' is-queued' : ''}`}
                        style={{ borderColor: `${itemQ.color}88` }}
                        onClick={() => toggleQueue(item)}
                        title={isQueued ? 'Remove from queue' : `Queue: → 1× ${yieldName}`}
                      >
                        {isQueued && (
                          <span className="artefact-upgrade-feed-check" aria-hidden="true">✓</span>
                        )}
                        <span className="artefact-upgrade-feed-gem" style={{ color: itemQ.color }}>◆</span>
                        <span className="artefact-upgrade-feed-name">{item.name}</span>
                        <span className="artefact-upgrade-feed-yield">→ 1× {yieldName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Footer: commit upgrade (with confirm if queue is valuable) ── */}
        {!atCap && (
          <footer className="artefact-upgrade-footer">
            {confirmingUpgrade ? (
              <div className="artefact-upgrade-confirm">
                <span className="artefact-upgrade-confirm-msg">
                  Upgrade and sacrifice {queuedItems.length}{' '}
                  artefact{queuedItems.length === 1 ? '' : 's'}? This cannot be undone.
                </span>
                <div className="artefact-upgrade-confirm-btns">
                  <button
                    type="button"
                    className="save-btn save-btn-danger"
                    onClick={commitUpgrade}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="save-btn"
                    onClick={() => setConfirmingUpgrade(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="save-btn artefact-upgrade-confirm-btn"
                disabled={!canAfford}
                onClick={onUpgrade}
              >
                {upgradeLabel}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

export default ArtefactUpgradeModal;
