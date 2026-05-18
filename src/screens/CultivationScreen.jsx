import { useState, useEffect, useMemo } from 'react';
import PRODUCERS from '../data/producers';
import ProducerLane from '../components/ProducerLane';
import ProducerDetailModal from '../components/ProducerDetailModal';
import UpgradeCard, { OwnedUpgradeChip } from '../components/UpgradeCard';
import { fmt, fmtRate } from '../utils/format';

/**
 * The qi-investment shop. Cookie-Clicker model — producers are stackable
 * (geometric cost curve), upgrades are one-time permanent purchases.
 *
 * Sticky header shows live qi + qi/s readouts (polled from refs to avoid
 * triggering useCultivation re-renders).
 */
export default function CultivationScreen({ cultivation, producers, upgrades, crystal, qiSparks }) {
  const [tab, setTab]         = useState('producers');     // 'producers' | 'upgrades'
  const [buyMode, setBuyMode] = useState(1);             // 1 | 10 | 'max'
  const [qi, setQi]           = useState(() => cultivation.qiRef?.current ?? 0);
  const [rate, setRate]       = useState(() => cultivation.rateRef?.current ?? 0);
  // Producer detail modal — opens when the player taps a lane's leader sprite.
  // Stores the producer object directly so the modal can read sprites/desc.
  const [detailProducer, setDetailProducer] = useState(null);

  // Poll the cultivation refs ~10×/sec for the sticky header.
  // useCultivation deliberately never re-renders on qi/rate change, so we
  // sample the refs ourselves. 100 ms is enough to read animated; cheaper
  // than rAF and matches the cadence used elsewhere for status displays.
  useEffect(() => {
    const id = setInterval(() => {
      setQi(cultivation.qiRef?.current ?? 0);
      setRate(cultivation.rateRef?.current ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, [cultivation.qiRef, cultivation.rateRef]);

  // Auto-promote the default buy chip to ×10 once the player owns 10+ of any
  // producer they can currently afford — kills thumb-tendinitis at scale.
  // Only fires the FIRST time the threshold is crossed; the player can still
  // override their pick afterwards.
  const [autoPromoted, setAutoPromoted] = useState(false);
  useEffect(() => {
    if (autoPromoted || buyMode !== 1) return;
    const anyTen = PRODUCERS.some(p => (producers.getOwned(p.id) ?? 0) >= 10);
    if (anyTen) {
      setBuyMode(10);
      setAutoPromoted(true);
    }
  }, [autoPromoted, buyMode, producers]);

  const handleBuy = useMemo(() => (id, count) => {
    if (!Number.isFinite(count) || count <= 0) return;
    const cost = producers.getCost(id, count);
    if (cost <= 0) return;
    // Atomic: spendQi succeeds only if the player can afford it. Producer
    // count is incremented only on a successful spend.
    if (cultivation.spendQi(cost)) {
      producers.buy(id, count);
      // Refresh the local qi display so the buy button's "affordable" state
      // updates immediately (the 100 ms poll would lag the click).
      setQi(cultivation.qiRef.current);
    }
  }, [cultivation, producers]);

  // Shared upgrade evaluation context — both visibility filter and unlock
  // check read the same shape. Memoised on realm/crystal/producer/mechanic
  // identity so the upgrade tab doesn't re-evaluate every frame.
  const upgradeCtx = useMemo(() => ({
    realmIndex:       cultivation.realmIndex,
    crystalLevel:     crystal?.level ?? 0,
    getProducerOwned: (pid) => producers.getOwned(pid),
    getMechanicTier:  (mid) => qiSparks?.getMechanicTier?.(mid) ?? 0,
  }), [cultivation.realmIndex, crystal?.level, producers, qiSparks]);

  const handleBuyUpgrade = useMemo(() => (id) => {
    if (!upgrades) return;
    if (upgrades.isOwned(id)) return;
    // Cost lives on the upgrade definition itself.
    const def = upgrades.getVisible(upgradeCtx).find(u => u.id === id);
    if (!def) return;
    if (cultivation.spendQi(def.cost)) {
      upgrades.buy(id);
      // Round 3 — mechanic_tier upgrades grant a spark via useQiSparks.grant.
      // Effect.type === 'grant_spark' carries the sparkId to apply. Other
      // effect types are pure aggregator changes consumed elsewhere.
      if (def.effect?.type === 'grant_spark' && def.effect.sparkId) {
        qiSparks?.grant?.(def.effect.sparkId);
      }
      setQi(cultivation.qiRef.current);
    }
  }, [cultivation, upgrades, qiSparks, upgradeCtx]);

  const realmIndex = cultivation.realmIndex;

  // Resolve visible upgrades for the current state. Hidden upgrades stay
  // invisible until at least their "tease threshold" condition is met
  // (≥50% of the gating producer count, or realm/crystal-level reached).
  const visibleUpgrades = useMemo(() => {
    if (!upgrades) return [];
    return upgrades.getVisible(upgradeCtx);
  }, [upgrades, upgradeCtx]);

  // Cookie-Clicker pattern: separate available (full cards) from purchased
  // (compact chips). Owned upgrades pile up over time — pushing them to a
  // dense section at the bottom keeps the buyable list scannable.
  const { availableUpgrades, ownedUpgrades } = useMemo(() => {
    const available = [];
    const owned     = [];
    for (const u of visibleUpgrades) {
      if (upgrades.isOwned(u.id)) owned.push(u);
      else available.push(u);
    }
    return { availableUpgrades: available, ownedUpgrades: owned };
  }, [visibleUpgrades, upgrades]);

  return (
    <div className="cultivation-screen">
      <div className="cs-sticky-header">
        <div className="cs-qi-display">{fmt(qi)} Qi</div>
        <div className="cs-rate-display">+{fmtRate(rate)} / sec</div>
      </div>

      <div className="cs-tabs">
        <button
          className={`cs-tab${tab === 'producers' ? ' cs-tab-active' : ''}`}
          onClick={() => setTab('producers')}
        >Producers</button>
        <button
          className={`cs-tab${tab === 'upgrades' ? ' cs-tab-active' : ''}`}
          onClick={() => setTab('upgrades')}
        >Upgrades</button>
      </div>

      {tab === 'producers' && (
        <>
          <div className="cs-buy-mode-row">
            <span className="cs-buy-mode-label">Buy:</span>
            <button
              className={`cs-buy-mode-chip${buyMode === 1 ? ' cs-buy-mode-chip-active' : ''}`}
              onClick={() => setBuyMode(1)}
            >×1</button>
            <button
              className={`cs-buy-mode-chip${buyMode === 10 ? ' cs-buy-mode-chip-active' : ''}`}
              onClick={() => setBuyMode(10)}
            >×10</button>
            <button
              className={`cs-buy-mode-chip${buyMode === 'max' ? ' cs-buy-mode-chip-active' : ''}`}
              onClick={() => setBuyMode('max')}
            >Max</button>
          </div>
          <div className="cs-list">
            {PRODUCERS.map(p => (
              <ProducerLane
                key={p.id}
                producer={p}
                owned={producers.getOwned(p.id)}
                unlocked={producers.isUnlocked(p.id, realmIndex)}
                buyMode={buyMode}
                qi={qi}
                producers={producers}
                onBuy={handleBuy}
                onShowDetail={setDetailProducer}
              />
            ))}
          </div>
        </>
      )}

      {detailProducer && (
        <ProducerDetailModal
          producer={detailProducer}
          owned={producers.getOwned(detailProducer.id)}
          unlocked={producers.isUnlocked(detailProducer.id, realmIndex)}
          upgradeMult={upgrades?.getProducerMult?.(detailProducer.id) ?? 1}
          totalGameRate={rate}
          onClose={() => setDetailProducer(null)}
        />
      )}

      {tab === 'upgrades' && (
        visibleUpgrades.length === 0 ? (
          <div className="cs-upgrades-empty">
            <div className="cs-upgrades-empty-title">No upgrades yet</div>
            <div className="cs-upgrades-empty-sub">
              Buy producers and climb realms to unlock upgrades.
            </div>
          </div>
        ) : (
          <div className="cs-up-sections">
            {availableUpgrades.length > 0 && (
              <div className="cs-up-grid">
                {availableUpgrades.map(u => (
                  <UpgradeCard
                    key={u.id}
                    upgrade={u}
                    unlocked={upgrades.checkUnlocked(u, upgradeCtx)}
                    qi={qi}
                    onBuy={handleBuyUpgrade}
                  />
                ))}
              </div>
            )}
            {ownedUpgrades.length > 0 && (
              <div className="cs-up-owned-section">
                <div className="cs-up-owned-header">
                  Purchased <span className="cs-up-owned-count">{ownedUpgrades.length}</span>
                </div>
                <div className="cs-up-owned-grid">
                  {ownedUpgrades.map(u => (
                    <OwnedUpgradeChip key={u.id} upgrade={u} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
