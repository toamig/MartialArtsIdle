import { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import PillDrawer from '../components/PillDrawer';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import { PILLS_BY_ID, ITEM_RARITY } from '../data/pills';
import WORLDS from '../data/worlds';

const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// home.png natural dimensions — used to compute the cover-scale sprite size.
const HOME_BG_W = 1376;
const HOME_BG_H = 768;

// 4 states: idle | boost | adboosted | adboosted-boost
function getSpriteState(boosting, adBoostActive) {
  if (adBoostActive && boosting) return 4;
  if (adBoostActive)             return 3;
  if (boosting)                  return 2;
  return 1;
}

function ActivePillBadge({ active }) {
  const { t: tGame } = useTranslation('game');
  const pill = PILLS_BY_ID[active.pillId];
  if (!pill) return null;
  const remaining = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 1000));
  const color = ITEM_RARITY[pill.rarity]?.color ?? '#aaa';
  const pillName = tGame(`items.${pill.id}.name`, { defaultValue: pill.name });
  return (
    <div className="active-pill-badge" style={{ borderColor: color }}>
      <span style={{ color }}>{pillName}</span>
      <span className="active-pill-time">{remaining}s</span>
    </div>
  );
}

/** Compact Qi/s readout — updated via rAF against the live rateRef so it
 *  reflects every modifier (law, boost, ad, pills) without React renders. */
function QiRateReadout({ rateRef, boosting, adBoostActive, maxed }) {
  const { t } = useTranslation('ui');
  const textRef = useRef(null);
  useEffect(() => {
    if (maxed) {
      if (textRef.current) textRef.current.textContent = t('home.peakQi');
      return;
    }
    let raf;
    const update = () => {
      const r = rateRef.current;
      if (textRef.current) {
        textRef.current.textContent = r >= 1000
          ? `+${(r / 1000).toFixed(1)}K Qi/s`
          : `+${r.toFixed(1)} Qi/s`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [rateRef, maxed, t]);

  const cls = `qi-rate${boosting ? ' qi-rate-boosted' : ''}${adBoostActive ? ' qi-rate-ad' : ''}`;
  return (
    <div className={cls}>
      <span ref={textRef} className="qi-rate-value">—</span>
      {boosting       && <span className="qi-rate-badge">×3</span>}
      {adBoostActive  && <span className="qi-rate-badge qi-rate-badge-ad">×2</span>}
    </div>
  );
}

/** Circular floating rewarded-ad button — top-right corner of the scene. */
function HeavenlyQiButton({ ad, adBoostActive, adBoostRemaining, maxed }) {
  const { t } = useTranslation('ui');
  if (maxed) return null;

  if (adBoostActive) {
    return (
      <div className="hq-btn hq-btn-active" title={t('home.heavenlyQiActive')}>
        <span className="hq-icon">✦</span>
        <span className="hq-label">×2</span>
        <span className="hq-sub">{adBoostRemaining}</span>
      </div>
    );
  }

  const disabled = !ad.isReady;
  const label = ad.isCooldown
    ? formatCooldown(ad.cooldownRemaining)
    : ad.isLoading
    ? '…'
    : '✦';
  const subtitle = ad.isCooldown
    ? t('home.cooldown')
    : ad.isLoading
    ? t('home.channeling')
    : t('home.heavenlyQi');

  return (
    <button
      className={`hq-btn${ad.isReady ? ' hq-btn-ready' : ''}${ad.isCooldown ? ' hq-btn-cd' : ''}`}
      onClick={ad.show}
      disabled={disabled}
      title={ad.isReady ? t('home.channelTitle') : subtitle}
    >
      <span className="hq-icon">{label}</span>
      <span className="hq-sub">{subtitle}</span>
    </button>
  );
}

const HOLD_HINT_SEEN_KEY = 'mai_home_hold_hint_seen';
const HOLD_HINT_IDLE_MS  = 60 * 1000; // re-show hint after this long without holding

const ACTIVITY_ICON  = { combat: '⚔', gathering: '🌿', mining: '⛏' };
const ACTIVITY_LABEL = { combat: 'Fighting', gathering: 'Gathering', mining: 'Mining' };

function IdleChip({ idleAssignment }) {
  const { t: tGame } = useTranslation('game');
  if (!idleAssignment) return null;
  const { activity, worldIndex, regionIndex } = idleAssignment;
  const region = WORLDS[worldIndex]?.regions?.[regionIndex];
  if (!region) return null;
  const regionName = tGame(`regions.${region.name}.name`, { defaultValue: region.name });
  return (
    <div className="home-idle-chip">
      <span className="home-idle-icon">{ACTIVITY_ICON[activity]}</span>
      <span className="home-idle-label">{ACTIVITY_LABEL[activity]}: {regionName}</span>
    </div>
  );
}

function HomeScreen({ cultivation, pills, inventory, selections, onOpenSelections, idleAssignment }) {
  const { t } = useTranslation('ui');
  const {
    realmName,
    nextRealmName,
    qiRef,
    costRef,
    rateRef,
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

  // Sprite scales with the rendered background height (cover-scale math) so
  // the character stays proportional to the art across every screen shape.
  const [spriteScale, setSpriteScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const scale = Math.max(window.innerWidth / HOME_BG_W, window.innerHeight / HOME_BG_H);
      setSpriteScale((HOME_BG_H * scale * 0.21) / 128);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // ── Rewarded ad: cultivation boost ─────────────────────────────────────────
  const onCultivationReward = useCallback(() => {
    activateAdBoost(AD_BOOST_DURATION_MS);
  }, [activateAdBoost]);

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Hold-hint visibility ───────────────────────────────────────────────────
  //   Shows a small fading hint beneath the character until the player holds
  //   for the first time. Re-appears after 60s of no holding, so returning
  //   players still remember the interaction.
  const [showHoldHint, setShowHoldHint] = useState(() => {
    try { return !localStorage.getItem(HOLD_HINT_SEEN_KEY); } catch { return true; }
  });

  // Pill drawer state
  const [pillDrawerOpen, setPillDrawerOpen] = useState(false);
  const totalOwnedPills = pills
    ? PILLS_BY_ID && Object.keys(PILLS_BY_ID).reduce((n, id) => n + pills.getOwnedCount(id), 0)
    : 0;
  const idleTimerRef = useRef(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setShowHoldHint(true), HOLD_HINT_IDLE_MS);
  }, []);
  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimerRef.current); }, [resetIdleTimer]);

  // ── Pointer handlers ────────────────────────────────────────────────────────
  const handlePointerDown = (e) => {
    e.preventDefault();
    startBoost();
    const rect = e.currentTarget.getBoundingClientRect();
    spawnVFX({ type: 'burst', x: e.clientX - rect.left, y: e.clientY - rect.top, duration: 600 });
    if (showHoldHint) {
      setShowHoldHint(false);
      try { localStorage.setItem(HOLD_HINT_SEEN_KEY, '1'); } catch {}
    }
    resetIdleTimer();
  };

  const handlePointerUp = () => { stopBoost(); resetIdleTimer(); };

  // ── Ad boost countdown label ─────────────────────────────────────────────
  const adBoostRemaining = adBoostActive
    ? formatCooldown(adBoostEndsAt - Date.now())
    : null;

  const spriteState = getSpriteState(boosting, adBoostActive);
  const spriteSrc   = `${BASE}sprites/cultivator/state${spriteState}.png`;
  const fps         = boosting ? 14 : 5;

  return (
    <div className="screen home-screen">
      {/* Full-screen background */}
      <div className="home-bg" style={{ backgroundImage: `url(${BASE}backgrounds/home.png)` }} />

      {/* Offline earnings modal */}
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

      {/* ── Top HUD: title + Heavenly Qi button (absolute inside) ────────── */}
      <div className="home-hud-top">
        <img
          className="home-title-img"
          src={`${BASE}Title.png`}
          alt="The Long Road to Heaven"
        />
        <HeavenlyQiButton
          ad={cultivationAd}
          adBoostActive={adBoostActive}
          adBoostRemaining={adBoostRemaining}
          maxed={maxed}
        />
      </div>

      {/* Spacer — pushes the bottom stack down */}
      <div className="home-spacer" />

      {/* ── Bottom stack (top-to-bottom): qi/s → hint → character → realm name → bar ── */}
      <div className="home-hud-bottom">

        {/* Active idle assignment — shows what's being farmed in the background */}
        <IdleChip idleAssignment={idleAssignment} />

        {/* Qi/s readout — above the player's head, just above hold hint */}
        <QiRateReadout
          rateRef={rateRef}
          boosting={boosting}
          adBoostActive={adBoostActive}
          maxed={maxed}
        />

        {/* Hold hint — right below qi/s, fades after first hold */}
        {!maxed && (
          <div className={`home-hold-hint${showHoldHint ? '' : ' home-hold-hint-fade'}`}>
            {t('home.holdToCultivate')}
          </div>
        )}

        {/* Character — centered in flow */}
        <div
          className={`fighter-stage home-fighter-stage ${boosting ? 'stage-boosted' : ''} ${adBoostActive ? 'stage-ad-boosted' : ''}`}
          style={{ width: `${128 * spriteScale}px`, height: `${128 * spriteScale}px` }}
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
            scale={spriteScale}
          />
        </div>

        {/* Realm / stage name — right above the bar */}
        <div className="home-realm-name">{realmName}</div>

        {/* QI progress bar */}
        <div className="home-bar-wrap">
          <RealmProgressBar
            qiRef={qiRef}
            costRef={costRef}
            currentRealm={realmName}
            nextRealm={nextRealmName}
            boosting={boosting}
            maxed={maxed}
          />
        </div>

      </div>

      {/* ── Pending selections badge — bottom-left above nav ───────────── */}
      {selections?.pendingCount > 0 && (
        <div className="home-selections-float">
          <button className="home-sel-btn" onClick={onOpenSelections}>
            <span className="home-sel-btn-icon">✦</span>
            <span className="home-sel-btn-label">Rewards</span>
            <span className="home-sel-btn-count">{selections.pendingCount}</span>
          </button>
        </div>
      )}

      {/* ── Pills: floating bottom-right above nav ──────────────────────── */}
      {pills && (pills.activePills.length > 0 || totalOwnedPills > 0) && (
        <div className="home-pill-float">
          {pills.activePills.length > 0 && (
            <div className="active-pills-bar">
              {pills.activePills.map((ap, i) => (
                <ActivePillBadge key={`${ap.pillId}-${i}`} active={ap} />
              ))}
            </div>
          )}
          {totalOwnedPills > 0 && (
            <button
              className="home-pill-btn"
              onClick={() => setPillDrawerOpen(true)}
            >
              <span className="home-pill-btn-icon">◈</span>
              <span className="home-pill-btn-label">{t('home.pills')}</span>
              <span className="home-pill-btn-count">{totalOwnedPills}</span>
            </button>
          )}
        </div>
      )}

      {/* Pill drawer — tabs by category */}
      <PillDrawer
        open={pillDrawerOpen}
        onClose={() => setPillDrawerOpen(false)}
        defaultTab="cultivation"
        pills={pills}
      />
    </div>
  );
}

export default HomeScreen;
