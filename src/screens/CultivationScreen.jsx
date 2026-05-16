import { useState, useEffect, useMemo } from 'react';
import PRODUCERS from '../data/producers';
import ProducerRow from '../components/ProducerRow';
import UpgradeCard from '../components/UpgradeCard';
import { fmt, fmtRate } from '../utils/format';

/**
 * The qi-investment shop. Cookie-Clicker model — producers are stackable
 * (geometric cost curve), upgrades are one-time permanent purchases.
 *
 * Sticky header shows live qi + qi/s readouts (polled from refs to avoid
 * triggering useCultivation re-renders).
 */
export default function CultivationScreen({ cultivation, producers, upgrades, crystal, qiSparks }) {
  const [tab, setTab]       = useState('producers');     // 'producers' | 'upgrades'
  const [buyMode, setBuyMode] = useState(1);             // 1 | 10 | 'max'
  const [qi, setQi]         = useState(() => cultivation.qiRef?.current ?? 0);
  const [rate, setRate]     = useState(() => cultivation.rateRef?.current ?? 0);

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
              <ProducerRow
                key={p.id}
                producer={p}
                owned={producers.getOwned(p.id)}
                unlocked={producers.isUnlocked(p.id, realmIndex)}
                buyMode={buyMode}
                qi={qi}
                producers={producers}
                onBuy={handleBuy}
              />
            ))}
          </div>
        </>
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
          <div className="cs-up-grid">
            {visibleUpgrades.map(u => (
              <UpgradeCard
                key={u.id}
                upgrade={u}
                owned={upgrades.isOwned(u.id)}
                unlocked={upgrades.checkUnlocked(u, upgradeCtx)}
                qi={qi}
                onBuy={handleBuyUpgrade}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
