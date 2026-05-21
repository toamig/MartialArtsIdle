import { useState, useMemo, useEffect } from 'react';
import { CULTIVATION_ITEMS, RARITY, getRefinedQi } from '../data/materials';
import { getRequiredRefinedQi } from '../hooks/useQiCrystal';
import { FEATURES } from '../data/featureFlags';
import { fmt as fmtQi } from '../utils/format';

const BASE = import.meta.env.BASE_URL;

// 2026-05-21 Dial-5: capped at L100. Mirrors useQiCrystal.js + HomeScreen.jsx.
const TIER_THRESHOLDS = [100, 75, 50, 25, 10, 1];
const TIER_VALUES     = [  6,  5,  4,  3,  2, 1];
const RARITY_ORDER    = ['Iron', 'Bronze', 'Silver', 'Gold', 'Transcendent'];

function getCrystalTier(level) {
  if (level <= 0) return null;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (level >= TIER_THRESHOLDS[i]) return TIER_VALUES[i];
  }
  return 1;
}

function fmtRqi(n) {
  n = Math.floor(n);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/** Walk the level-up loop on immutable values — returns target level + leftover RQI. */
function simulateLevelUp(startLevel, startRqi) {
  let level = startLevel;
  let rqi   = startRqi;
  // Safety cap — shouldn't really hit this but prevents infinite loops
  for (let guard = 0; guard < 100_000; guard++) {
    const needed = getRequiredRefinedQi(level + 1);
    if (rqi >= needed) { rqi -= needed; level += 1; }
    else break;
  }
  return { level, rqi };
}

/** How much RQI we need to FEED (beyond current refinedQi) to reach targetLevel. */
function rqiNeededToReachLevel(targetLevel, currentLevel, currentRqi) {
  if (targetLevel <= currentLevel) return 0;
  let total = 0;
  for (let l = currentLevel + 1; l <= targetLevel; l++) {
    total += getRequiredRefinedQi(l);
  }
  return Math.max(0, total - currentRqi);
}

/**
 * Greedy consumption plan — consumes stones cheapest-first to minimise
 * waste of rare stones. Returns { plan, actualRqi } where actualRqi is the
 * total RQI the plan will deliver (may slightly overshoot the target since
 * stones come in discrete values).
 */
function planConsumption(rqiTarget, availableStones) {
  if (rqiTarget <= 0) return { plan: [], actualRqi: 0 };
  // Cheapest first — keeps rare stones in reserve
  const sorted = [...availableStones].sort((a, b) => a.refinedQiValue - b.refinedQiValue);
  const plan   = [];
  let remaining = rqiTarget;

  for (const stone of sorted) {
    if (remaining <= 0) break;
    if (stone.refinedQiValue <= 0 || stone.qty <= 0) continue;
    // Ceil so we always reach or exceed the target with this stone type
    const idealQty = Math.ceil(remaining / stone.refinedQiValue);
    const used     = Math.min(idealQty, stone.qty);
    if (used > 0) {
      plan.push({ id: stone.id, qty: used, rqi: used * stone.refinedQiValue });
      remaining -= used * stone.refinedQiValue;
    }
  }

  const actualRqi = plan.reduce((sum, p) => sum + p.rqi, 0);
  return { plan, actualRqi };
}

/** Rarity-chip: compact pill showing how many stones the player owns at that tier. */
function ReserveChip({ rarity, qty, rqi, dim }) {
  const color = RARITY[rarity]?.color ?? '#9ca3af';
  return (
    <div
      className={`cfm-reserve-chip${dim ? ' cfm-reserve-dim' : ''}`}
      style={{ '--rarity-color': color }}
    >
      <span className="cfm-reserve-label">{rarity}</span>
      <span className="cfm-reserve-qty">×{qty}</span>
      {qty > 0 && <span className="cfm-reserve-rqi">{fmtRqi(rqi)}</span>}
    </div>
  );
}

function CrystalFeedModal({ crystal, inventory, cultivation, onClose, onEvolve }) {
  // Cookie-Clicker pivot (v1) — under !FEATURES.combat the crystal levels via
  // qi spend instead of stone feeding. Branch to a dedicated component so the
  // existing stone-flow code stays untouched for v2.
  if (!FEATURES.combat) {
    return <CrystalQiFeedModal crystal={crystal} cultivation={cultivation} onClose={onClose} onEvolve={onEvolve} />;
  }
  const { level, refinedQi, requiredForNext, crystalQiMult, feedMultiple } = crystal;

  // ── Available stones (recomputed every render; cheap) ──────────────────────
  const availableStones = CULTIVATION_ITEMS
    .map(item => ({
      ...item,
      qty:            inventory.getQuantity(item.id),
      refinedQiValue: getRefinedQi(item.id),
    }))
    .filter(s => s.qty > 0);

  const totalAvailableRqi = availableStones.reduce((sum, s) => sum + s.qty * s.refinedQiValue, 0);

  // Aggregated reserves by rarity for the summary chips.
  // ALL 5 rarities are always included so the reserves grid never reflows
  // (depleted rarities render dimmed instead of disappearing — keeps the
  // Refine button at a stable Y position between taps).
  const reserves = RARITY_ORDER
    .map(rarity => {
      const stones = availableStones.filter(s => s.rarity === rarity);
      const qty = stones.reduce((sum, s) => sum + s.qty, 0);
      const rqi = stones.reduce((sum, s) => sum + s.qty * s.refinedQiValue, 0);
      return { rarity, qty, rqi, dim: qty === 0 };
    });
  const hasAnyStones = reserves.some(r => r.qty > 0);

  // ── Feed amount state ──────────────────────────────────────────────────────
  // Default to "just enough for next level" (capped at available). Gives the
  // player a useful starting point without overcommitting.
  const [feedAmount, setFeedAmount] = useState(() => {
    const need = Math.max(0, requiredForNext - refinedQi);
    return Math.min(need, totalAvailableRqi);
  });

  // Cap feedAmount if inventory shrinks (e.g. after a feed) or changes
  useEffect(() => {
    if (feedAmount > totalAvailableRqi) setFeedAmount(totalAvailableRqi);
  }, [feedAmount, totalAvailableRqi]);

  const clampedAmount = Math.max(0, Math.min(feedAmount, totalAvailableRqi));

  // ── Plan + preview ─────────────────────────────────────────────────────────
  const { plan, actualRqi } = useMemo(
    () => planConsumption(clampedAmount, availableStones),
    // availableStones recomputes every render, so we need to key on something stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clampedAmount, totalAvailableRqi],
  );

  const preview       = simulateLevelUp(level, refinedQi + actualRqi);
  const levelsGained  = preview.level - level;
  const willLevelUp   = levelsGained > 0;

  // Aggregate plan by rarity for the "Will consume" line
  const consumptionByRarity = useMemo(() => {
    const map = {};
    for (const p of plan) {
      const stone = availableStones.find(s => s.id === p.id);
      const r = stone?.rarity ?? 'Iron';
      map[r] = (map[r] ?? 0) + p.qty;
    }
    return RARITY_ORDER.filter(r => map[r] > 0).map(r => ({ rarity: r, qty: map[r] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // ── Quick-preset buttons ───────────────────────────────────────────────────
  const applyTarget = (extraLevels) => {
    const need = rqiNeededToReachLevel(level + extraLevels, level, refinedQi);
    setFeedAmount(Math.min(need, totalAvailableRqi));
  };
  const applyMax = () => setFeedAmount(totalAvailableRqi);
  const applyZero = () => setFeedAmount(0);

  // Max level achievable with current reserves — shown on the "Max" button
  const maxPreview = simulateLevelUp(level, refinedQi + totalAvailableRqi);
  const maxLevelsGained = maxPreview.level - level;

  // ── Feed action ────────────────────────────────────────────────────────────
  const handleRefine = () => {
    if (plan.length === 0) return;
    const result = feedMultiple(plan);
    setFeedAmount(0);
    if (result?.tierChanged && onEvolve) {
      onEvolve({ previousTier: result.previousTier, newTier: result.newTier, newLevel: result.newLevel });
      onClose?.();
    }
  };

  // ── Progress bar ───────────────────────────────────────────────────────────
  const pct         = requiredForNext > 0 ? Math.min(100, (refinedQi / requiredForNext) * 100) : 100;
  const previewPct  = requiredForNext > 0
    ? Math.min(100, ((refinedQi + actualRqi - levelsGained * requiredForNext) / requiredForNext) * 100)
    : 100;
  // If we level up, the bar should visually fill — but the preview fill is
  // only meaningful inside the current level. Show full preview when leveling up.
  const previewFillPct = willLevelUp
    ? 100
    : Math.min(100, ((refinedQi + actualRqi) / requiredForNext) * 100);

  const tier       = getCrystalTier(level) ?? 1;
  const crystalSrc = `${BASE}crystals/crystal_${tier}.png`;
  const nextBonus  = ((preview.level + 1) * (preview.level + 4)) / 2; // not used but kept if needed

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="cfm-header">
          <img src={crystalSrc} className="cfm-crystal-img" alt="" draggable="false" />
          <div className="cfm-header-text">
            <div className="cfm-title">Qi Crystal</div>
            <div className="cfm-subtitle">Level {level}</div>
          </div>
          <div className="cfm-bonus-block">
            {/* Current Qi/s — rendered at level 0 too (as "+0 Qi/s") so the
                bonus-block height doesn't change when the crystal is unleveled. */}
            <div className={`cfm-bonus-current${level === 0 ? ' cfm-bonus-current-zero' : ''}`}>
              <span className="cfm-bonus-gem">◆</span> ×{(crystalQiMult ?? 1).toFixed(2)} Qi gain
            </div>
            {/* Always rendered so its space is reserved; invisible when not
                leveling up. Prevents the header from growing and shifting the
                rest of the modal down between taps. */}
            <div className={`cfm-bonus-next${willLevelUp ? '' : ' cfm-bonus-next-hidden'}`}>
              <span className="cfm-bonus-arrow">▲</span>
              <span>
                Lv.{preview.level} → ×{(1 + preview.level * 0.01).toFixed(2)} Qi gain
              </span>
            </div>
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cfm-modal-body">
        {/* ── Refinement progress ── */}
        <div className="cfm-progress-wrap">
          <div className="cfm-progress-track">
            <div className="cfm-progress-fill" style={{ width: `${pct}%` }} />
            {actualRqi > 0 && (
              <div
                className="cfm-progress-preview"
                style={{ width: `${previewFillPct}%` }}
              />
            )}
          </div>
          <div className="cfm-progress-labels">
            <span>{fmtRqi(refinedQi)} / {fmtRqi(requiredForNext)} RQI</span>
            <span className="cfm-progress-next">Level {level + 1}</span>
          </div>
        </div>

        {/* ── Stone Reserves ── */}
        <div className="cfm-section-label">
          Stone Reserves
          <span className="cfm-section-meta">
            Total: <strong>{fmtRqi(totalAvailableRqi)} RQI</strong>
          </span>
        </div>

        {/* All 5 rarity chips always render — depleted ones dim instead of
            disappearing so the section height stays constant and the Refine
            button never jumps between taps. */}
        <div className="cfm-reserves">
          {reserves.map(r => (
            <ReserveChip key={r.rarity} rarity={r.rarity} qty={r.qty} rqi={r.rqi} dim={r.dim} />
          ))}
        </div>

        {/* ── Refinement amount ── */}
        <div className="cfm-section-label">
          Refinement Amount
          <span className={`cfm-section-meta cfm-level-preview${willLevelUp ? '' : ' cfm-level-preview-idle'}`}>
            Level {level} <span className="cfm-level-arrow">→</span> <strong>{preview.level}</strong>
            <span className={`cfm-level-delta${willLevelUp ? '' : ' cfm-level-delta-hidden'}`}>
              +{levelsGained}
            </span>
          </span>
        </div>

        <div className="cfm-amount-ctl">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalAvailableRqi)}
            step={Math.max(1, Math.round(totalAvailableRqi / 200))}
            value={clampedAmount}
            onChange={e => setFeedAmount(Number(e.target.value))}
            className="cfm-slider"
            disabled={!hasAnyStones}
            style={{
              '--slider-pct': totalAvailableRqi > 0
                ? `${(clampedAmount / totalAvailableRqi) * 100}%`
                : '0%',
            }}
          />
          <div className="cfm-amount-row">
            <button
              className="cfm-qty-btn"
              onClick={() => setFeedAmount(a => Math.max(0, a - Math.max(1, Math.round(totalAvailableRqi / 20))))}
              disabled={clampedAmount === 0}
            >−</button>
            <span className="cfm-amount-val">
              <strong>{fmtRqi(clampedAmount)}</strong>
              <span className="cfm-amount-unit">RQI</span>
            </span>
            <button
              className="cfm-qty-btn"
              onClick={() => setFeedAmount(a => Math.min(totalAvailableRqi, a + Math.max(1, Math.round(totalAvailableRqi / 20))))}
              disabled={clampedAmount >= totalAvailableRqi}
            >+</button>
          </div>

          <div className="cfm-quick-row">
            <button className="cfm-quick-btn" onClick={applyZero} disabled={!hasAnyStones}>Clear</button>
            <button className="cfm-quick-btn" onClick={() => applyTarget(1)}  disabled={!hasAnyStones}>+1 Lv</button>
            <button className="cfm-quick-btn" onClick={() => applyTarget(5)}  disabled={!hasAnyStones}>+5 Lv</button>
            <button className="cfm-quick-btn" onClick={() => applyTarget(10)} disabled={!hasAnyStones}>+10 Lv</button>
            <button className="cfm-quick-btn cfm-quick-max" onClick={applyMax} disabled={!hasAnyStones}>
              Max{maxLevelsGained > 0 ? ` (+${maxLevelsGained})` : ''}
            </button>
          </div>

          {/* Consumption preview — always rendered with a placeholder when
              nothing is selected, so the container height stays fixed. */}
          <div className="cfm-consumption">
            <span className="cfm-consumption-label">Will consume:</span>
            {plan.length > 0 ? (
              consumptionByRarity.map(c => (
                <span
                  key={c.rarity}
                  className="cfm-consumption-pill"
                  style={{ '--rarity-color': RARITY[c.rarity]?.color }}
                >
                  {c.qty} {c.rarity}
                </span>
              ))
            ) : (
              <span className="cfm-consumption-empty">
                {hasAnyStones ? 'nothing selected' : 'gather QI stones first'}
              </span>
            )}
          </div>
        </div>
        </div>

        <button
          className={`cfm-refine-btn${willLevelUp ? ' cfm-refine-levelup' : ''}`}
          onClick={handleRefine}
          disabled={plan.length === 0 || actualRqi <= 0 || !hasAnyStones}
        >
          {!hasAnyStones
            ? '🪨 No stones to refine'
            : willLevelUp
              ? `⚡ Refine → Level ${preview.level}`
              : plan.length === 0
                ? '⚡ Refine'
                : `⚡ Refine +${fmtRqi(actualRqi)} RQI`}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 * Qi-fed variant (v1 — Cookie-Clicker pivot)
 *
 * Same level curve as the stone-fed modal (1 qi → 1 RQI). The slider sets
 * how much qi to spend; quick presets compute the cost to reach +N levels.
 * On refine, `crystal.feedQi(amount, cultivation.spendQi)` atomically spends
 * qi and runs the level-up loop. If the spend fails (player can't afford
 * it), nothing changes.
 * ─────────────────────────────────────────────────────────────────────── */
function CrystalQiFeedModal({ crystal, cultivation, onClose, onEvolve }) {
  const { level, refinedQi, requiredForNext, crystalQiMult, feedQi } = crystal;

  // Live qi balance — same poll cadence as CultivationScreen's sticky header.
  const [qi, setQi] = useState(() => cultivation?.qiRef?.current ?? 0);
  useEffect(() => {
    if (!cultivation?.qiRef) return;
    const id = setInterval(() => setQi(cultivation.qiRef.current), 100);
    return () => clearInterval(id);
  }, [cultivation?.qiRef]);

  // Spend-amount state. Default: just enough for next level, capped at balance.
  const [spendAmount, setSpendAmount] = useState(() => {
    const need = Math.max(0, requiredForNext - refinedQi);
    return Math.min(need, Math.floor(qi));
  });

  // Cap if balance shrinks (e.g. player buys producers in another tab).
  useEffect(() => {
    if (spendAmount > qi) setSpendAmount(Math.floor(qi));
  }, [spendAmount, qi]);

  const clamped = Math.max(0, Math.min(spendAmount, Math.floor(qi)));
  const preview = simulateLevelUp(level, refinedQi + clamped);
  const levelsGained = preview.level - level;
  const willLevelUp  = levelsGained > 0;

  // Quick presets — same semantics as the stone-fed modal.
  const applyTarget = (extraLevels) => {
    const need = rqiNeededToReachLevel(level + extraLevels, level, refinedQi);
    setSpendAmount(Math.min(need, Math.floor(qi)));
  };
  const applyMax  = () => setSpendAmount(Math.floor(qi));
  const applyZero = () => setSpendAmount(0);

  const maxPreview      = simulateLevelUp(level, refinedQi + Math.floor(qi));
  const maxLevelsGained = maxPreview.level - level;

  const handleRefine = () => {
    if (clamped <= 0) return;
    const result = feedQi?.(clamped, cultivation?.spendQi);
    if (!result) return;
    setSpendAmount(0);
    setQi(cultivation?.qiRef?.current ?? 0);
    if (result.tierChanged && onEvolve) {
      onEvolve({ previousTier: result.previousTier, newTier: result.newTier, newLevel: result.newLevel });
      onClose?.();
    }
  };

  // Progress bar — same math as the stone variant.
  const pct = requiredForNext > 0 ? Math.min(100, (refinedQi / requiredForNext) * 100) : 100;
  const previewFillPct = willLevelUp
    ? 100
    : Math.min(100, ((refinedQi + clamped) / requiredForNext) * 100);

  const tier       = getCrystalTier(level) ?? 1;
  const crystalSrc = `${BASE}crystals/crystal_${tier}.png`;

  const balanceFloor = Math.floor(qi);
  const canAfford    = clamped > 0 && balanceFloor >= clamped;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cfm-modal" onClick={e => e.stopPropagation()}>

        {/* Header — same layout as the stone variant for visual continuity. */}
        <div className="cfm-header">
          <img src={crystalSrc} className="cfm-crystal-img" alt="" draggable="false" />
          <div className="cfm-header-text">
            <div className="cfm-title">Qi Crystal</div>
            <div className="cfm-subtitle">Level {level}</div>
          </div>
          <div className="cfm-bonus-block">
            <div className={`cfm-bonus-current${level === 0 ? ' cfm-bonus-current-zero' : ''}`}>
              <span className="cfm-bonus-gem">◆</span> ×{(crystalQiMult ?? 1).toFixed(2)} Qi gain
            </div>
            <div className={`cfm-bonus-next${willLevelUp ? '' : ' cfm-bonus-next-hidden'}`}>
              <span className="cfm-bonus-arrow">▲</span>
              <span>
                Lv.{preview.level} → ×{(1 + preview.level * 0.01).toFixed(2)} Qi gain
              </span>
            </div>
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="cfm-modal-body">

          {/* Refinement progress. */}
          <div className="cfm-progress-wrap">
            <div className="cfm-progress-track">
              <div className="cfm-progress-fill" style={{ width: `${pct}%` }} />
              {clamped > 0 && (
                <div className="cfm-progress-preview" style={{ width: `${previewFillPct}%` }} />
              )}
            </div>
            <div className="cfm-progress-labels">
              <span>{fmtRqi(refinedQi)} / {fmtRqi(requiredForNext)} RQI</span>
              <span className="cfm-progress-next">Level {level + 1}</span>
            </div>
          </div>

          {/* Balance — replaces "Stone Reserves" in the stone variant. */}
          <div className="cfm-section-label">
            Qi Balance
            <span className="cfm-section-meta">
              Available: <strong>{fmtQi(balanceFloor)} Qi</strong>
            </span>
          </div>

          {/* Amount control. */}
          <div className="cfm-section-label">
            Refinement Amount
            <span className={`cfm-section-meta cfm-level-preview${willLevelUp ? '' : ' cfm-level-preview-idle'}`}>
              Level {level} <span className="cfm-level-arrow">→</span> <strong>{preview.level}</strong>
              <span className={`cfm-level-delta${willLevelUp ? '' : ' cfm-level-delta-hidden'}`}>
                +{levelsGained}
              </span>
            </span>
          </div>

          <div className="cfm-amount-ctl">
            <input
              type="range"
              min={0}
              max={Math.max(1, balanceFloor)}
              step={Math.max(1, Math.round(balanceFloor / 200))}
              value={clamped}
              onChange={e => setSpendAmount(Number(e.target.value))}
              className="cfm-slider"
              disabled={balanceFloor <= 0}
              style={{
                '--slider-pct': balanceFloor > 0
                  ? `${(clamped / balanceFloor) * 100}%`
                  : '0%',
              }}
            />
            <div className="cfm-amount-row">
              <button
                className="cfm-qty-btn"
                onClick={() => setSpendAmount(a => Math.max(0, a - Math.max(1, Math.round(balanceFloor / 20))))}
                disabled={clamped === 0}
              >−</button>
              <span className="cfm-amount-val">
                <strong>{fmtQi(clamped)}</strong>
                <span className="cfm-amount-unit">Qi</span>
              </span>
              <button
                className="cfm-qty-btn"
                onClick={() => setSpendAmount(a => Math.min(balanceFloor, a + Math.max(1, Math.round(balanceFloor / 20))))}
                disabled={clamped >= balanceFloor}
              >+</button>
            </div>

            <div className="cfm-quick-row">
              <button className="cfm-quick-btn" onClick={applyZero} disabled={balanceFloor <= 0}>Clear</button>
              <button className="cfm-quick-btn" onClick={() => applyTarget(1)}  disabled={balanceFloor <= 0}>+1 Lv</button>
              <button className="cfm-quick-btn" onClick={() => applyTarget(5)}  disabled={balanceFloor <= 0}>+5 Lv</button>
              <button className="cfm-quick-btn" onClick={() => applyTarget(10)} disabled={balanceFloor <= 0}>+10 Lv</button>
              <button className="cfm-quick-btn cfm-quick-max" onClick={applyMax} disabled={balanceFloor <= 0}>
                Max{maxLevelsGained > 0 ? ` (+${maxLevelsGained})` : ''}
              </button>
            </div>
          </div>
        </div>

        <button
          className={`cfm-refine-btn${willLevelUp ? ' cfm-refine-levelup' : ''}`}
          onClick={handleRefine}
          disabled={!canAfford}
        >
          {balanceFloor <= 0
            ? '🪨 Not enough Qi'
            : willLevelUp
              ? `⚡ Refine → Level ${preview.level}`
              : clamped <= 0
                ? '⚡ Refine'
                : `⚡ Refine (-${fmtQi(clamped)} Qi)`}
        </button>
      </div>
    </div>
  );
}

export default CrystalFeedModal;
