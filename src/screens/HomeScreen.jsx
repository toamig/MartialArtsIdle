import { useCallback, useState } from 'react';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import { PILLS, PILLS_BY_ID, ITEM_RARITY } from '../data/pills';

const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// 4 states: idle | boost | adboosted | adboosted-boost
function getSpriteState(boosting, adBoostActive) {
  if (adBoostActive && boosting) return 4;
  if (adBoostActive)             return 3;
  if (boosting)                  return 2;
  return 1;
}

// ─── Pill effect display helpers ──────────────────────────────────────────────

const PILL_STAT_DISPLAY = {
  qi_speed:          'Qi Speed',
  defense:           'Defense',
  health:            'Health',
  physical_damage:   'Phys. Dmg',
  elemental_damage:  'Elem. Dmg',
  harvest_speed:     'Harvest Speed',
  mining_speed:      'Mining Speed',
  harvest_luck:      'Harvest Luck',
  mining_luck:       'Mining Luck',
  soul_toughness:    'Soul Tough.',
  elemental_defense: 'Elem. Def',
  essence:           'Essence',
};

function formatPillEffect(eff, duration) {
  const label = PILL_STAT_DISPLAY[eff.stat] ?? eff.stat;
  if (eff.stat === 'qi_speed') {
    return `+${Math.round(eff.value * 100)}% ${label} (${duration}s)`;
  }
  if (eff.type === 'increased') {
    return `+${Math.round(eff.value * 100)}% ${label} (${duration}s)`;
  }
  return `+${eff.value} ${label} (${duration}s)`;
}

function PillCard({ pillId, qty, onUse }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pill = PILLS_BY_ID[pillId];
  if (!pill) return null;
  const color = ITEM_RARITY[pill.rarity]?.color ?? '#aaa';

  return (
    <div
      className="pill-card"
      style={{ borderColor: color }}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
    >
      <span className="pill-card-name" style={{ color }}>{pill.name}</span>
      <span className="pill-card-qty">x{qty}</span>
      <button className="pill-card-use" onClick={() => onUse(pillId)}>Use</button>
      {showTooltip && (
        <div className="pill-tooltip">
          {pill.effects.map((eff, i) => (
            <div key={i}>{formatPillEffect(eff, pill.duration)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivePillBadge({ active }) {
  const pill = PILLS_BY_ID[active.pillId];
  if (!pill) return null;
  const remaining = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 1000));
  const color = ITEM_RARITY[pill.rarity]?.color ?? '#aaa';
  return (
    <div className="active-pill-badge" style={{ borderColor: color }}>
      <span style={{ color }}>{pill.name}</span>
      <span className="active-pill-time">{remaining}s</span>
    </div>
  );
}

function HomeScreen({ cultivation, pills, inventory }) {
  const {
    realmName,
    nextRealmName,
    qiRef,
    costRef,
    boosting,
    maxed,
    startBoost,
    stopBoost,
    activateAdBoost,
    adBoostActive,
    adBoostEndsAt,
    offlineEarnings,
    collectOfflineEarnings,
  } = cultivation;

  const { vfxLayer, spawnVFX } = useVFX();

  // ── Rewarded ad: cultivation boost ─────────────────────────────────────────
  const onCultivationReward = useCallback(() => {
    activateAdBoost(AD_BOOST_DURATION_MS);
  }, [activateAdBoost]);

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Pointer handlers ────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    startBoost();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnVFX({ type: 'burst', x: e.clientX - rect.left, y: e.clientY - rect.top, duration: 600 });
  };

  const handlePointerUp = () => stopBoost();

  // ── Ad boost countdown label ─────────────────────────────────────────────
  const adBoostRemaining = adBoostActive
    ? formatCooldown(adBoostEndsAt - Date.now())
    : null;

  const spriteState = getSpriteState(boosting, adBoostActive);
  const spriteSrc   = `${BASE}sprites/cultivator/state${spriteState}.png`;
  const fps         = boosting ? 14 : 5;

  return (
    <div className="screen home-screen">
      {/* Offline earnings modal — shown once on open if player was away 5+ min */}
      {offlineEarnings > 0 && (
        <OfflineEarningsModal
          amount={offlineEarnings}
          onCollect={() => collectOfflineEarnings(1)}
          onDoubleCollect={cultivationAd.isReady ? () => {
            collectOfflineEarnings(2);
            cultivationAd.show();
          } : null}
        />
      )}

      <h1>Martial Arts Idle</h1>
      <p className="subtitle">{maxed ? 'You have reached the Peak!' : realmName}</p>

      <div className="cultivation-layout">
        <div
          className={`fighter-stage ${boosting ? 'stage-boosted' : ''} ${adBoostActive ? 'stage-ad-boosted' : ''}`}
          style={{ backgroundImage: `url(${BASE}backgrounds/cultivation.png)` }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {vfxLayer}
          <SpriteAnimator
            key={spriteState}
            src={spriteSrc}
            frameWidth={128}
            frameHeight={128}
            frameCount={4}
            fps={fps}
            scale={1.5}
          />
          <div className={`boost-label${boosting ? '' : ' boost-label-hidden'}`}>3x Cultivation!</div>
          {adBoostActive && (
            <div className="ad-boost-label">Heavenly Qi ×2 — {adBoostRemaining}</div>
          )}
          <p className="tap-hint">
            {maxed ? 'Peak Achieved' : 'Hold to cultivate faster'}
          </p>
        </div>

        <RealmProgressBar
          qiRef={qiRef}
          costRef={costRef}
          currentRealm={realmName}
          nextRealm={nextRealmName}
          boosting={boosting}
        />
      </div>

      {/* ── Rewarded Ad: Channel Heavenly Qi ─────────────────────────────── */}
      {!maxed && !adBoostActive && (cultivationAd.isReady || cultivationAd.isCooldown || cultivationAd.isLoading) && (
        <div className="ad-reward-section">
          <button
            className="ad-reward-btn"
            onClick={cultivationAd.show}
            disabled={!cultivationAd.isReady}
          >
            {cultivationAd.isCooldown
              ? `Heavenly Qi — ${formatCooldown(cultivationAd.cooldownRemaining)}`
              : cultivationAd.isLoading
              ? 'Channeling...'
              : '✦ Channel Heavenly Qi — 2× for 30 min'}
          </button>
        </div>
      )}

      {/* ── Active Pill Buffs ──────────────────────────────────────────── */}
      {pills && pills.activePills.length > 0 && (
        <div className="active-pills-bar">
          {pills.activePills.map((ap, i) => (
            <ActivePillBadge key={`${ap.pillId}-${i}`} active={ap} />
          ))}
        </div>
      )}

      {/* ── Pill Inventory ─────────────────────────────────────────────── */}
      {pills && (
        <div className="pill-grid">
          {PILLS.filter(p => pills.getOwnedCount(p.id) > 0).map(p => (
            <PillCard
              key={p.id}
              pillId={p.id}
              qty={pills.getOwnedCount(p.id)}
              onUse={pills.usePill}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HomeScreen;
