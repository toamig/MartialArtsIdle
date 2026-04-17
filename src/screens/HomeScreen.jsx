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
function QiRateReadout({ rateRef, focusMultRef, boosting, adBoostActive, maxed }) {
  const { t } = useTranslation('ui');
  const textRef  = useRef(null);
  const boostRef = useRef(null);
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
      if (boostRef.current && focusMultRef) {
        const mult = (focusMultRef.current ?? 300) / 100;
        boostRef.current.textContent = `×${mult % 1 === 0 ? mult.toFixed(0) : mult.toFixed(1)}`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [rateRef, focusMultRef, maxed, t]);

  const cls = `qi-rate${boosting ? ' qi-rate-boosted' : ''}${adBoostActive ? ' qi-rate-ad' : ''}`;
  return (
    <div className={cls}>
      <span ref={textRef} className="qi-rate-value">—</span>
      {boosting      && <span ref={boostRef} className="qi-rate-badge">×3</span>}
      {adBoostActive && <span className="qi-rate-badge qi-rate-badge-ad">×2</span>}
    </div>
  );
}

/** Current / target qi — single chip updated via rAF. */
function QiProgressChip({ qiRef, costRef, maxed }) {
  const textRef = useRef(null);
  useEffect(() => {
    const fmt = (n) => {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.floor(n));
    };
    let raf;
    const update = () => {
      if (textRef.current) {
        textRef.current.textContent = maxed
          ? 'Peak Qi'
          : `${fmt(qiRef.current)} / ${fmt(costRef.current)}`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, maxed]);
  return (
    <div className="qi-rate">
      <span ref={textRef}>—</span>
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

const CRYSTAL_TIER_THRESHOLDS = [1000, 750, 500, 350, 200, 100, 50, 25, 10, 1];
const CRYSTAL_TIER_VALUES     = [  10,   9,   8,   7,   6,   5,  4,  3,  2, 1];

function getCrystalTier(level) {
  for (let i = 0; i < CRYSTAL_TIER_THRESHOLDS.length; i++) {
    if (level >= CRYSTAL_TIER_THRESHOLDS[i]) return CRYSTAL_TIER_VALUES[i];
  }
  return 1;
}

// Glow and particle colors per visual tier.
// glowA = inner/bright,  glowB = outer/dim,  particles = 5 shades for the stream.
const CRYSTAL_COLORS = {
  locked: { glowA: 'rgba(80,80,100,0)',    glowB: 'rgba(50,50,70,0)',     particles: ['#555566','#444455','#666677','#333344','#777788'] },
  1:      { glowA: 'rgba(136,153,187,0.9)',glowB: 'rgba(100,120,160,0.5)',particles: ['#8899bb','#aabbcc','#99aacc','#778899','#bbccdd'] },
  2:      { glowA: 'rgba(68,136,187,1)',   glowB: 'rgba(50,100,150,0.55)',particles: ['#4488bb','#88bbdd','#66aacc','#3377aa','#99ccee'] },
  3:      { glowA: 'rgba(0,187,204,1)',    glowB: 'rgba(0,150,160,0.55)', particles: ['#00bbcc','#aaffee','#00ccdd','#00aaaa','#88eeff'] },
  4:      { glowA: 'rgba(17,85,204,1)',    glowB: 'rgba(10,60,160,0.55)', particles: ['#1155cc','#55ddff','#2266dd','#0044bb','#66ccff'] },
  5:      { glowA: 'rgba(34,51,170,1)',    glowB: 'rgba(20,40,140,0.55)', particles: ['#2233aa','#6699ff','#3344cc','#1122bb','#7788ff'] },
  6:      { glowA: 'rgba(102,0,204,1)',    glowB: 'rgba(80,0,160,0.55)',  particles: ['#6600cc','#9966ff','#7711dd','#5500bb','#aa88ff'] },
  7:      { glowA: 'rgba(136,0,221,1)',    glowB: 'rgba(100,0,180,0.55)', particles: ['#8800dd','#aaddff','#9911ee','#7700cc','#bbaaff'] },
  8:      { glowA: 'rgba(204,153,255,1)',  glowB: 'rgba(170,100,240,0.55)',particles: ['#cc99ff','#eeddff','#bb88ee','#aa77dd','#ddbfff'] },
  9:      { glowA: 'rgba(255,204,68,1)',   glowB: 'rgba(220,160,40,0.55)',particles: ['#ffcc44','#fffacc','#ffdd66','#ffbb22','#fff0aa'] },
  10:     { glowA: 'rgba(255,170,34,1)',   glowB: 'rgba(220,120,0,0.55)', particles: ['#ffaa22','#ffe566','#ffbb44','#ff9900','#fff0aa'] },
};

/** Key Crystal — locked (dim, greyscale) or unlocked (glowing, tappable). */
function KeyCrystal({ crystal, isUnlocked, onOpen }) {
  if (!isUnlocked) {
    return (
      <div className="home-crystal-anchor">
        <div className="home-crystal-float home-crystal-float-slow">
          <span className="home-crystal-tag home-crystal-tag-locked">🔒 Qi Crystal</span>
          <img
            src={`${BASE}crystals/crystal_locked.png`}
            className="home-crystal-img home-crystal-locked"
            alt="Qi Crystal"
            draggable="false"
          />
        </div>
      </div>
    );
  }

  const { level } = crystal;
  const tier = getCrystalTier(level);
  const { glowA, glowB } = CRYSTAL_COLORS[tier];
  return (
    <div className="home-crystal-anchor" onClick={onOpen}>
      <div className="home-crystal-float" style={{ '--cg-a': glowA, '--cg-b': glowB }}>
        <span className="home-crystal-tag">Qi Crystal</span>
        <span className="home-crystal-evolve">Lv {level}</span>
        <img
          src={`${BASE}crystals/crystal_${tier}.png`}
          className="home-crystal-img"
          alt="Qi Crystal"
          draggable="false"
        />
      </div>
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
  return <div className="qi-rate"><span ref={ref}>—</span></div>;
}

/** Left panel — visible only at wide (≥ 900 px) breakpoints.
 *  Shows cultivation stats so the player doesn't have to look at the bar. */
function HomePCLeftPanel({ realmName, realmStage, qiRef, costRef, rateRef, focusMultRef, boosting, adBoostActive, maxed }) {
  const { t } = useTranslation('ui');
  return (
    <div className="home-pc-left">
      <div className="home-pc-section-label">Cultivation</div>
      <div className="home-pc-realm-name">{realmName.split(' - ')[0]}</div>
      {realmStage && <div className="home-pc-realm-stage">{realmStage}</div>}
      <PCQiProgressText qiRef={qiRef} costRef={costRef} maxed={maxed} />
      <QiRateReadout rateRef={rateRef} focusMultRef={focusMultRef} boosting={boosting} adBoostActive={adBoostActive} maxed={maxed} />
    </div>
  );
}

/** Falling qi-particle stream between crystal and character (5 particles). */
function QiParticles({ colors }) {
  const p = colors?.particles ?? ['#a78bfa','#8b5cf6','#a78bfa','#ddd6fe','#7c3aed'];
  return (
    <div className="home-qi-particles" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`home-qi-particle home-qi-p${i + 1}`} style={{ background: p[i] }} />
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
    realmStage,
    nextRealmName,
    qiRef,
    costRef,
    rateRef,
    focusMultRef,
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
          realmStage={realmStage}
          qiRef={qiRef}
          focusMultRef={focusMultRef}
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

          {/* Realm title overlay — top center of scene, mobile only */}
          <div className="home-realm-overlay">
            <span className="home-realm-overlay-name">{realmName.split(' - ')[0]}</span>
            {realmStage && <span className="home-realm-overlay-stage">{realmStage}</span>}
          </div>

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
          <QiParticles colors={isCrystalUnlocked && crystal ? CRYSTAL_COLORS[getCrystalTier(crystal.level)] : CRYSTAL_COLORS[1]} />

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
            <div className="home-overlay-half">
              <QiProgressChip qiRef={qiRef} costRef={costRef} maxed={maxed} />
            </div>
            <div className="home-overlay-half">
              <QiRateReadout
                rateRef={rateRef}
                focusMultRef={focusMultRef}
                boosting={boosting}
                adBoostActive={adBoostActive}
                maxed={maxed}
              />
            </div>
          </div>

          <div className="home-bar-wrap">
            <RealmProgressBar
              qiRef={qiRef}
              costRef={costRef}
              currentRealm={realmName}
              nextRealm={nextRealmName}
              boosting={boosting}
              maxed={maxed}
              realmIndex={cultivation.realmIndex}
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
        defaultTab="combat"
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
