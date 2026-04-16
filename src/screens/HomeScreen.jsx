import { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import PillDrawer from '../components/PillDrawer';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import CrystalFeedModal from '../components/CrystalFeedModal';
import { PILLS_BY_ID } from '../data/pills';
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

// ── Top HUD bar ─────────────────────────────────────────────────────────────
function HomeTopHud({ jadeBalance, onNavigate }) {
  return (
    <div className="home-top-hud">
      <div className="home-hud-jade">
        <img
          src={`${BASE}sprites/items/blood_lotus.png`}
          className="home-hud-jade-icon"
          alt=""
          draggable="false"
        />
        <span className="home-hud-jade-amount">{jadeBalance ?? 0}</span>
      </div>
      <div className="home-hud-spacer" />
      <button
        className="home-hud-settings"
        onClick={() => onNavigate('settings')}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  );
}


/** Qi/s readout — updated via rAF so it tracks every modifier without re-renders. */
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

// ── Heavenly Qi chip — redesigned as a pill floating in the scene (top-right) ──
/** Purple pill chip — replaces the old circular button.  Shows a pulsing dot,
 *  a label, and an optional countdown when an ad boost is running or on CD. */
function HeavenlyQiButton({ ad, adBoostActive, adBoostRemaining, maxed }) {
  const { t } = useTranslation('ui');
  if (maxed) return null;

  if (adBoostActive) {
    return (
      <div className="home-hq-chip home-hq-chip-active" title={t('home.heavenlyQiActive')}>
        <span className="home-hq-dot" />
        <span className="home-hq-text">×2</span>
        <span className="home-hq-timer">{adBoostRemaining}</span>
      </div>
    );
  }

  const isCd      = ad.isCooldown;
  const isLoading = ad.isLoading;
  const label = isCd
    ? formatCooldown(ad.cooldownRemaining)
    : isLoading
    ? t('home.channeling')
    : t('home.heavenlyQi');

  return (
    <button
      className={`home-hq-chip${ad.isReady ? ' home-hq-chip-ready' : ''}${isCd ? ' home-hq-chip-cd' : ''}`}
      onClick={ad.show}
      disabled={!ad.isReady}
      title={ad.isReady ? t('home.channelTitle') : label}
    >
      <span className="home-hq-dot" />
      <span className="home-hq-text">{label}</span>
    </button>
  );
}

const HOLD_HINT_SEEN_KEY = 'mai_home_hold_hint_seen';
const HOLD_HINT_IDLE_MS  = 60 * 1000;

/** Key Crystal — hidden when locked, interactive when unlocked. */
function KeyCrystal({ crystal, isUnlocked, onOpen }) {
  if (!isUnlocked) return null;

  const { level, refinedQi, requiredForNext } = crystal;
  const progress = requiredForNext > 0 ? refinedQi / requiredForNext : 0;

  return (
    <div className="home-crystal-anchor home-crystal-unlocked" onClick={onOpen}>
      <div className="home-crystal-ring" style={{ '--progress': progress }}>
        <img
          src={`${BASE}sprites/items/origin_crystal.png`}
          className="home-crystal-sprite"
          alt="Key Crystal"
          draggable="false"
        />
      </div>
      <span className="home-crystal-level">Lv.{level}</span>
    </div>
  );
}

// ── PC-only left info panel ──────────────────────────────────────────────────

/** Compact qi text updated via rAF — avoids a React re-render every frame. */
function PCQiProgressText({ qiRef, costRef, maxed }) {
  const ref = useRef(null);
  useEffect(() => {
    if (maxed) {
      if (ref.current) ref.current.textContent = 'Peak Qi';
      return;
    }
    const fmt = (n) => {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.floor(n));
    };
    let raf;
    const tick = () => {
      if (ref.current)
        ref.current.textContent = `${fmt(qiRef.current)} / ${fmt(costRef.current)} Qi`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, maxed]);
  return <span ref={ref} className="home-pc-qi-text">—</span>;
}

/** Left panel — visible only at wide (≥ 900 px) breakpoints.
 *  Shows cultivation stats so the player doesn't have to look at the bar. */
function HomePCLeftPanel({ realmName, qiRef, costRef, rateRef, boosting, adBoostActive, maxed }) {
  const { t } = useTranslation('ui');
  return (
    <div className="home-pc-left">
      <div className="home-pc-section-label">Cultivation</div>
      <div className="home-pc-realm-name">{realmName}</div>
      <PCQiProgressText qiRef={qiRef} costRef={costRef} maxed={maxed} />
      <QiRateReadout rateRef={rateRef} boosting={boosting} adBoostActive={adBoostActive} maxed={maxed} />
      {!maxed && (
        <div className="home-pc-hold-badge">{t('home.holdToCultivate')}</div>
      )}
    </div>
  );
}

/** Falling qi-particle stream between crystal and character. */
function QiParticles() {
  return (
    <div className="home-qi-particles" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={`home-qi-particle home-qi-particle-${i + 1}`} />
      ))}
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
function HomeScreen({
  cultivation, pills, inventory,
  selections, onOpenSelections,
  onNavigate,
  crystal, isCrystalUnlocked,
}) {
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

  // Sprite scales with the rendered background height so the character stays
  // proportional to the art across every screen shape.
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

  // ── Rewarded ad ─────────────────────────────────────────────────────────
  const onCultivationReward = useCallback(() => {
    activateAdBoost(AD_BOOST_DURATION_MS);
  }, [activateAdBoost]);

  const cultivationAd = useRewardedAd(onCultivationReward, 30 * 60 * 1000, 'mai_ad_cd_cultivation');

  // ── Hold-hint ────────────────────────────────────────────────────────────
  const [showHoldHint, setShowHoldHint] = useState(() => {
    try { return !localStorage.getItem(HOLD_HINT_SEEN_KEY); } catch { return true; }
  });

  // ── Crystal feed modal ───────────────────────────────────────────────────
  const [crystalModalOpen, setCrystalModalOpen] = useState(false);

  // ── Pill drawer ──────────────────────────────────────────────────────────
  const [pillDrawerOpen, setPillDrawerOpen] = useState(false);
  const totalOwnedPills = pills
    ? Object.keys(PILLS_BY_ID).reduce((n, id) => n + pills.getOwnedCount(id), 0)
    : 0;

  const idleTimerRef = useRef(null);
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setShowHoldHint(true), HOLD_HINT_IDLE_MS);
  }, []);
  useEffect(() => { resetIdleTimer(); return () => clearTimeout(idleTimerRef.current); }, [resetIdleTimer]);

  // ── Pointer handlers ─────────────────────────────────────────────────────
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

  // ── Ad boost countdown ───────────────────────────────────────────────────
  const adBoostRemaining = adBoostActive
    ? formatCooldown(adBoostEndsAt - Date.now())
    : null;

  const spriteState = getSpriteState(boosting, adBoostActive);
  const spriteSrc   = `${BASE}sprites/cultivator/state${spriteState}.png`;
  const fps         = boosting ? 14 : 5;

  // Jade balance — shown in the top HUD bar
  const jadeBalance = selections?.jadeBalance ?? 0;

  return (
    <div className="screen home-screen">
      {/* Full-screen background — center bottom so the hall floor and archway
          sit at the same visual depth regardless of screen aspect ratio */}
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

      {/* ── Top HUD bar: jade balance + settings ─────────────────────── */}
      <HomeTopHud jadeBalance={jadeBalance} onNavigate={onNavigate} />

      {/* ── Scene: fills all space between HUD and nav bar ───────────── */}
      <div className="home-scene">

        {/* Left info panel — only visible at PC widths (≥ 900 px) */}
        <HomePCLeftPanel
          realmName={realmName}
          qiRef={qiRef}
          costRef={costRef}
          rateRef={rateRef}
          boosting={boosting}
          adBoostActive={adBoostActive}
          maxed={maxed}
        />

        {/* Centre column: cultivation zone + bar */}
        <div className="home-pc-center">

        {/* ── Cultivation zone: absolutely-positioned scene elements ─── */}
        <div className="home-cultivation-zone">

          {/* Rewards badge — scene chip, top-left */}
          {selections?.pendingCount > 0 && (
            <div className="home-chip-tl">
              <button className="home-sel-btn" onClick={onOpenSelections}>
                <span className="home-sel-btn-icon">📦</span>
                <span className="home-sel-btn-label">
                  {selections.pendingCount} Reward{selections.pendingCount !== 1 ? 's' : ''}!
                </span>
              </button>
            </div>
          )}

          {/* Heavenly Qi pill chip — scene chip, top-right */}
          <HeavenlyQiButton
            ad={cultivationAd}
            adBoostActive={adBoostActive}
            adBoostRemaining={adBoostRemaining}
            maxed={maxed}
          />

          {/* Key Crystal — floats in the archway gap */}
          <KeyCrystal
            crystal={crystal}
            isUnlocked={isCrystalUnlocked}
            onOpen={() => setCrystalModalOpen(true)}
          />

          {/* Qi particles drifting from crystal toward character */}
          <QiParticles />

          {/* Character + hold-hint group — grounded at scene bottom */}
          <div className="home-char-group">
            {!maxed && (
              <div className={`home-hold-hint${showHoldHint ? '' : ' home-hold-hint-fade'}`}>
                {t('home.holdToCultivate')}
              </div>
            )}
            <div
              className={`fighter-stage home-fighter-stage${boosting ? ' stage-boosted' : ''}${adBoostActive ? ' stage-ad-boosted' : ''}`}
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
          </div>

        </div>{/* end home-cultivation-zone */}

        {/* ── Bottom section: realm name + qi/s row + bar ──────────── */}
        <div className="home-scene-bottom">

          {/* Overlay row — hidden on PC (info lives in left panel instead) */}
          <div className="home-scene-overlay-row">
            <div className="home-realm-name">{realmName}</div>
            <QiRateReadout
              rateRef={rateRef}
              boosting={boosting}
              adBoostActive={adBoostActive}
              maxed={maxed}
            />
          </div>

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

        </div>{/* end home-pc-center */}

        {/* Right spacer panel — only visible at PC widths, balances the layout */}
        <div className="home-pc-right" aria-hidden="true" />

      </div>{/* end home-scene */}

      {/* ── Pills: floating bottom-right above nav ───────────────────── */}
      {pills && totalOwnedPills > 0 && (
        <div className="home-pill-float">
          <button
            className="home-pill-btn"
            onClick={() => setPillDrawerOpen(true)}
          >
            <span className="home-pill-btn-icon">◈</span>
            <span className="home-pill-btn-label">{t('home.pills')}</span>
            <span className="home-pill-btn-count">{totalOwnedPills}</span>
          </button>
        </div>
      )}

      {/* Pill drawer — tabs by category */}
      <PillDrawer
        open={pillDrawerOpen}
        onClose={() => setPillDrawerOpen(false)}
        defaultTab="cultivation"
        pills={pills}
      />

      {/* Crystal feed modal */}
      {crystalModalOpen && isCrystalUnlocked && (
        <CrystalFeedModal
          crystal={crystal}
          inventory={inventory}
          onClose={() => setCrystalModalOpen(false)}
        />
      )}
    </div>
  );
}

export default HomeScreen;
