import { useCallback, useState, useRef, useEffect } from 'react';
import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import OfflineEarningsModal from '../components/OfflineEarningsModal';
import PillDrawer from '../components/PillDrawer';
import { useVFX } from '../components/VFXLayer';
import { useRewardedAd, formatCooldown } from '../ads/useRewardedAd';
import { PILLS_BY_ID, ITEM_RARITY } from '../data/pills';

const BASE = import.meta.env.BASE_URL;
const AD_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// home.png natural dimensions — used to anchor the character to a fixed point
// in the ART regardless of viewport shape (so the character sits inside the
// doorway on desktop, mobile portrait, and every aspect ratio in between).
const HOME_BG_W = 1376;
const HOME_BG_H = 768;
// Normalised anchor (0..1) inside the ART where the character's feet should land.
// 0.50 = horizontal center of the painting.
// Higher Y = lower on screen. Tweak this to nudge the character up/down.
const HOME_ANCHOR_X = 0.50;
const HOME_ANCHOR_Y = 0.82;

// 4 states: idle | boost | adboosted | adboosted-boost
function getSpriteState(boosting, adBoostActive) {
  if (adBoostActive && boosting) return 4;
  if (adBoostActive)             return 3;
  if (boosting)                  return 2;
  return 1;
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

/** Compact Qi/s readout — updated via rAF against the live rateRef so it
 *  reflects every modifier (law, boost, ad, pills) without React renders. */
function QiRateReadout({ rateRef, boosting, adBoostActive, maxed }) {
  const textRef = useRef(null);
  useEffect(() => {
    if (maxed) {
      if (textRef.current) textRef.current.textContent = 'Peak Qi';
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
  }, [rateRef, maxed]);

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
  if (maxed) return null;

  if (adBoostActive) {
    return (
      <div className="hq-btn hq-btn-active" title="Heavenly Qi active">
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
  const subtitle = ad.isCooldown ? 'Cooldown' : ad.isLoading ? 'Channeling' : 'Heavenly Qi';

  return (
    <button
      className={`hq-btn${ad.isReady ? ' hq-btn-ready' : ''}${ad.isCooldown ? ' hq-btn-cd' : ''}`}
      onClick={ad.show}
      disabled={disabled}
      title={ad.isReady ? 'Channel Heavenly Qi — 2× for 30 min' : subtitle}
    >
      <span className="hq-icon">{label}</span>
      <span className="hq-sub">{subtitle}</span>
    </button>
  );
}

const HOLD_HINT_SEEN_KEY = 'mai_home_hold_hint_seen';
const HOLD_HINT_IDLE_MS  = 60 * 1000; // re-show hint after this long without holding

function HomeScreen({ cultivation, pills, inventory }) {
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

  // Anchor the character to a fixed point inside the BACKGROUND ART (not the
  // viewport), so it lines up the same way on every screen shape. We replicate
  // the `background-size: cover; background-position: center center` math and
  // compute where the art anchor lands in viewport pixels.
  const stageRef = useRef(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, imgH: 0 });
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // cover scale = larger of (vw/imgW, vh/imgH)
      const scale = Math.max(vw / HOME_BG_W, vh / HOME_BG_H);
      const renderedW = HOME_BG_W * scale;
      const renderedH = HOME_BG_H * scale;
      const offsetX = (vw - renderedW) / 2; // center center
      const offsetY = (vh - renderedH) / 2;
      setAnchor({
        x: offsetX + renderedW * HOME_ANCHOR_X,
        y: offsetY + renderedH * HOME_ANCHOR_Y,
        imgH: renderedH,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Sprite scales with the RENDERED image height so the character stays the
  // same size *relative to the art* across every screen shape.
  // 0.21 × 1080 ≈ 225px on a standard desktop viewport.
  const spriteScale = anchor.imgH > 0 ? (anchor.imgH * 0.21) / 128 : 1;

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

      {/* ── Top HUD: title only (stage name lives on the QI bar now) ────── */}
      <div className="home-hud-top">
        <img
          className="home-title-img"
          src={`${BASE}Title.png`}
          alt="The Long Road to Heaven"
        />
      </div>

      {/* QI bar + live rate readout — anchored just above the character. */}
      <div
        className="home-bar-wrap home-bar-over-char"
        style={{
          left: `${anchor.x}px`,
          top:  `${anchor.y - 128 * spriteScale - 12}px`,
        }}
      >
        <RealmProgressBar
          qiRef={qiRef}
          costRef={costRef}
          currentRealm={realmName}
          nextRealm={nextRealmName}
          boosting={boosting}
          maxed={maxed}
        />
        <QiRateReadout
          rateRef={rateRef}
          boosting={boosting}
          adBoostActive={adBoostActive}
          maxed={maxed}
        />
      </div>

      {/* Floating Heavenly Qi button — top-right, always accessible. */}
      <HeavenlyQiButton
        ad={cultivationAd}
        adBoostActive={adBoostActive}
        adBoostRemaining={adBoostRemaining}
        maxed={maxed}
      />

      {/* Character stage — absolutely positioned to lock onto a fixed point
          inside the background art (see anchor calc above). */}
      <div
        ref={stageRef}
        className={`fighter-stage home-fighter-stage ${boosting ? 'stage-boosted' : ''} ${adBoostActive ? 'stage-ad-boosted' : ''}`}
        style={{
          left: `${anchor.x}px`,
          top:  `${anchor.y}px`,
          width:  `${128 * spriteScale}px`,
          height: `${128 * spriteScale}px`,
        }}
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

      {/* Hold hint — sits just below the character's feet, fades after the
          player first holds, reappears after idle (see resetIdleTimer). */}
      {!maxed && (
        <div
          className={`home-hold-hint${showHoldHint ? '' : ' home-hold-hint-fade'}`}
          style={{
            left: `${anchor.x}px`,
            top:  `${anchor.y + 8}px`,
          }}
        >
          Hold to cultivate faster
        </div>
      )}

      {/* Spacer — pushes HUD to the bottom */}
      <div className="home-spacer" />

      {/* ── Bottom HUD: active buffs + compact pill button ──────────────── */}
      <div className="home-hud-bottom">

        {/* Active pill buffs — live countdowns */}
        {pills && pills.activePills.length > 0 && (
          <div className="active-pills-bar">
            {pills.activePills.map((ap, i) => (
              <ActivePillBadge key={`${ap.pillId}-${i}`} active={ap} />
            ))}
          </div>
        )}

        {/* Compact "Pills" button — opens the tabbed drawer */}
        {pills && totalOwnedPills > 0 && (
          <button
            className="home-pill-btn"
            onClick={() => setPillDrawerOpen(true)}
          >
            <span className="home-pill-btn-icon">◈</span>
            <span className="home-pill-btn-label">Pills</span>
            <span className="home-pill-btn-count">{totalOwnedPills}</span>
          </button>
        )}

      </div>

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
