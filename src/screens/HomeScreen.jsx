import { useCallback } from 'react';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';

const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// 4 states: idle | boost | adboosted | adboosted-boost
function getSpriteState(boosting, adBoostActive) {
  if (adBoostActive && boosting) return 4;
  if (adBoostActive)             return 3;
  if (boosting)                  return 2;
  return 1;
}

function HomeScreen({ cultivation }) {
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
        <RealmProgressBar
          qiRef={qiRef}
          costRef={costRef}
          currentRealm={realmName}
          nextRealm={nextRealmName}
          boosting={boosting}
        />

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
    </div>
  );
}

export default HomeScreen;
