import { useRef, useEffect, useState } from 'react';
import SpriteAnimator from './SpriteAnimator';
import DamageNumber from './DamageNumber';
import { getSprites, FW, FH } from '../sprites/spriteGen';
import { preloadEnemySprites } from '../utils/preload';
import { ALL_MATERIALS, RARITY } from '../data/materials';

const BASE = import.meta.env.BASE_URL;

// Custom player sprites: 128×128 px per frame
const PLAYER_IDLE_SRC   = `${BASE}sprites/combat/player-idle.png`;
const PLAYER_ATTACK_SRC = `${BASE}sprites/combat/player-attack.png`;
const PLAYER_HIT_SRC    = `${BASE}sprites/combat/player-hit.png`;
const PLAYER_IDLE_FW    = 128;
const PLAYER_IDLE_FH    = 128;

// Canvas-generated sprites: 32×40, displayed at 3×
const GEN_SCALE = 3;

// Separate counter so drop orb ids don't collide with dmgId
let dropOrbId = 0;

// Per-rarity dark tinted backgrounds — gives each tier its own jewel tone
// so the player immediately reads the item's value before looking at the icon.
const RARITY_ORB_BG = {
  Iron:         'rgba(26, 29, 36, 0.94)',
  Bronze:       'rgba(40, 18,  3, 0.94)',
  Silver:       'rgba(20, 24, 40, 0.94)',
  Gold:         'rgba(44, 30,  2, 0.94)',
  Transcendent: 'rgba(26,  5, 46, 0.94)',
};

/**
 * A single material-drop orb — jewel-style circle with item sprite inside.
 * Pops at the enemy's feet, hovers briefly, then arcs to the player.
 *
 * `collectDx/Dy` are pixel deltas from spawn origin to player center so
 * the arc always lands on the character regardless of screen size.
 */
function DropOrb({ itemId, qty, left, top, collectDx, collectDy, delay }) {
  const mat   = ALL_MATERIALS[itemId];
  const color = RARITY[mat?.rarity]?.color ?? '#9ca3af';
  const bg    = RARITY_ORB_BG[mat?.rarity]  ?? 'rgba(8, 6, 16, 0.94)';
  return (
    <div
      className="combat-drop-orb"
      style={{
        left:            `${left}px`,
        top:             `${top}px`,
        '--drop-color':  color,
        '--drop-bg':     bg,
        '--collect-dx':  `${collectDx}px`,
        '--collect-dy':  `${collectDy}px`,
        animationDelay:  `${delay}ms`,
      }}
    >
      <img
        className="combat-drop-img"
        src={`${BASE}sprites/items/${itemId}.png`}
        alt=""
        draggable="false"
        onError={e => { e.currentTarget.style.opacity = '0'; }}
      />
      {qty > 1 && <span className="combat-drop-qty-badge">{qty}</span>}
    </div>
  );
}

/**
 * Resolve enemy sprite src for a given animation.
 * Returns null if the enemy has no custom sprite → canvas fallback.
 *
 * Expected file locations:
 *   public/sprites/enemies/{sprite}-idle.png    (4 frames, 128×128 each)
 *   public/sprites/enemies/{sprite}-attack.png  (4 frames, 128×128 each)
 */
function enemySpriteSrc(enemy, anim) {
  if (!enemy?.sprite) return null;
  return `${BASE}sprites/enemies/${enemy.sprite}-${anim}.png`;
}

/**
 * CombatStage — two fighters, strictly turn-based animations.
 *
 * enemy prop: resolved enemy object from data/enemies.js.
 *   enemy.sprite set   → load custom PNG sprite sheets.
 *   enemy.sprite null  → canvas-generated fallback.
 */
let dmgId = 0;

export default function CombatStage({
  phase,
  enemy,
  worldId = 1,
  playerAttackRef,
  enemyAttackRef,
  playerAnimDoneRef,
  enemyAnimDoneRef,
  spawnDamageNumberRef,
  spawnDropsRef,
  pHpBarRef,
  pHpTextRef,
  eHpBarRef,
  eHpTextRef,
}) {
  const sprites = getSprites();

  // Sprite scale: 75% of stage height — proportional on every device
  const stageRef = useRef(null);
  const [spriteScale, setSpriteScale] = useState(1.0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setSpriteScale((h * 0.75) / 128);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [pAnim, setPAnim] = useState('idle');
  const [eAnim, setEAnim] = useState('idle');
  const [dmgNums,  setDmgNums]  = useState([]);
  const [dropOrbs, setDropOrbs] = useState([]);
  const dmgTimersRef = useRef([]);

  const pRef      = useRef(null);
  const eRef      = useRef(null);
  const pFlashRef = useRef(null);
  const eFlashRef = useRef(null);

  const isFighting = phase === 'fighting';
  const isWon      = phase === 'won';
  const isLost     = phase === 'lost';

  const hasCustomEnemy = !!enemy?.sprite;
  const eIdleSrc   = hasCustomEnemy ? enemySpriteSrc(enemy, 'idle')   : null;
  const eAttackSrc = hasCustomEnemy ? enemySpriteSrc(enemy, 'attack') : null;
  const eHitSrc    = hasCustomEnemy ? enemySpriteSrc(enemy, 'hit')    : null;
  const eHitSrcRef = useRef(eHitSrc);
  eHitSrcRef.current = eHitSrc;

  useEffect(() => {
    playerAttackRef.current = () => {
      setPAnim('attack');
      setEAnim('hit');
      pRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(20px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
      // Only flash if no custom hit sprite
      if (!eHitSrcRef.current) {
        eFlashRef.current?.animate(
          [
            { opacity: 1, background: 'rgba(255,255,255,0.8)' },
            { opacity: 0, background: 'rgba(255,255,255,0)' },
          ],
          { duration: 250, easing: 'ease-out' },
        );
      }
    };

    enemyAttackRef.current = () => {
      setEAnim('attack');
      setPAnim('hit');
      eRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-20px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
    };

    return () => {
      playerAttackRef.current = null;
      enemyAttackRef.current  = null;
    };
  }, [playerAttackRef, enemyAttackRef]);

  useEffect(() => {
    if (phase !== 'fighting') {
      setPAnim('idle');
      setEAnim('idle');
    }
  }, [phase]);

  // Safety-net preload: if combat is entered directly (saved state, deep link)
  // without going through WorldsScreen, ensure enemy sheets are in cache.
  useEffect(() => {
    preloadEnemySprites(enemy?.sprite ?? null);
  }, [enemy?.sprite]);

  // Register the damage-number spawn callback so useCombat can trigger it.
  // Enemy damage (gold) spawns on the right side; player damage taken (red) on the left.
  // Optional 4th arg `opts` carries extra info — currently { exploit: bool }
  // which makes the number bigger, brighter, and prefixed with "EXPLOIT!".
  useEffect(() => {
    if (!spawnDamageNumberRef) return;
    spawnDamageNumberRef.current = (value, side, maxHp = 1000, opts = {}) => {
      const id = ++dmgId;
      const isEnemy = side === 'enemy';
      const exploit = !!opts.exploit;
      const x = isEnemy
        ? `${62 + Math.random() * 16}%`
        : `${8  + Math.random() * 14}%`;
      // y: 35%–70% of actual stage height so numbers stay proportional on all devices
      const stageH = stageRef.current?.getBoundingClientRect().height ?? 200;
      const y = Math.round(stageH * (0.35 + Math.random() * 0.35));
      // Two-curve font size:
      //   0–100% of enemy HP  → sqrt ramp  10–20 px  (small hits still visible)
      //   100%–100000% HP     → log ramp   20–44 px  (overkill hits feel massive)
      const ratio = value / maxHp; // uncapped
      let fontSize = ratio <= 1
        ? Math.round(10 + Math.pow(ratio, 0.5) * 10)
        : Math.round(Math.min(44, 20 + Math.log10(ratio) * 8));
      // Exploit hits get a 50% size boost so they read as a clear payoff.
      if (exploit) fontSize = Math.round(fontSize * 1.5);
      setDmgNums(prev => [...prev, { id, value, x, y, isEnemy, fontSize, exploit }]);
      const t = setTimeout(
        () => setDmgNums(prev => prev.filter(n => n.id !== id)),
        1300,
      );
      dmgTimersRef.current.push(t);
    };
    return () => {
      spawnDamageNumberRef.current = null;
      dmgTimersRef.current.forEach(clearTimeout);
      dmgTimersRef.current = [];
    };
  }, [spawnDamageNumberRef]);

  // Register drop-orb spawn callback. Called by useCombat with the material
  // drops array when the enemy dies, before the Victory overlay appears.
  useEffect(() => {
    if (!spawnDropsRef) return;
    spawnDropsRef.current = (drops) => {
      if (!drops?.length) return;
      const stage = stageRef.current;
      const { width: W, height: H } = stage?.getBoundingClientRect() ?? { width: 360, height: 180 };

      // Player character center — left ~18% of stage, ~45% down.
      // The collect arc ends here so the orb visually flies into the player.
      const playerX = W * 0.18;
      const playerY = H * 0.45;

      // Orb is 46px tall; no fall in the animation, just a pop in place.
      // Bottom edge must stay inside stage (overflow:hidden): top + 46 <= H.
      const orbSafeMaxTop = Math.max(0, H - 46);
      const orbs = drops.map((drop, i) => {
        // Spawn in the bottom 25% of the stage — right at the enemy's feet.
        const left   = Math.round(W * (0.58 + Math.random() * 0.18));
        const topMin = H * 0.75;                          // bottom-quarter start
        const topMax = Math.min(orbSafeMaxTop, H * 0.90); // no lower than safe max
        const top    = Math.round(topMin + Math.random() * Math.max(0, topMax - topMin));
        return {
          id:        ++dropOrbId,
          itemId:    drop.itemId,
          qty:       drop.qty,
          left,
          top,
          // Pixel deltas from spawn origin to player center.
          // At 100% of the CSS animation the orb is at its spawn origin
          // (transform starts fresh), so these are total deltas.
          collectDx: Math.round(playerX - left),
          collectDy: Math.round(playerY - top),
          delay:     i * 120,
        };
      });
      setDropOrbs(orbs);
      // 1.45 s per orb + stagger + small buffer
      const totalMs = 1450 + (drops.length - 1) * 120 + 100;
      const t = setTimeout(() => setDropOrbs([]), totalMs);
      dmgTimersRef.current.push(t);
    };
    return () => { spawnDropsRef.current = null; };
  }, [spawnDropsRef]);

  const onPlayerAttackDone = () => {
    setPAnim('idle');
    playerAnimDoneRef.current?.();
  };

  const onPlayerHitDone = () => {
    setPAnim('idle');
  };

  const onEnemyAttackDone = () => {
    setEAnim('idle');
    enemyAnimDoneRef.current?.();
  };

  const onEnemyHitDone = () => {
    setEAnim('idle');
  };

  // ── Enemy sprite selection ───────────────────────────────────────────────
  // Custom sprite when available, canvas fallback otherwise.
  const enemyIdleProps   = hasCustomEnemy
    ? { src: eIdleSrc,    frameWidth: 128, frameHeight: 128, scale: spriteScale }
    : { src: sprites.enemyIdle,   frameWidth: FW, frameHeight: FH, scale: GEN_SCALE };

  const enemyAttackProps = hasCustomEnemy
    ? { src: eAttackSrc,  frameWidth: 128, frameHeight: 128, scale: spriteScale }
    : { src: sprites.enemyAttack, frameWidth: FW, frameHeight: FH, scale: GEN_SCALE };

  return (
    <div
      ref={stageRef}
      className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}
      style={{ backgroundImage: `url(${BASE}backgrounds/world_${worldId}.png)` }}
    >

      {/* ── Player HUD (top-left) ─── */}
      <div className="stage-hud stage-hud-player">
        <span className="stage-hud-name">You</span>
        <div className="stage-hud-track">
          <div className="hud-bar-inner">
            <div ref={pHpBarRef} className="stage-hud-fill stage-hud-fill-player" style={{ width: '100%' }} />
          </div>
          <img className="hud-bar-frame-img hud-bar-frame-img-flipped" src={`${BASE}ui/bar_frame.png`} alt="" />
          <span ref={pHpTextRef} className="stage-hud-text">—</span>
        </div>
      </div>

      {/* ── Enemy HUD (top-right) ─── */}
      <div className="stage-hud stage-hud-enemy">
        <span className="stage-hud-name">{enemy?.name || 'Enemy'}</span>
        <div className="stage-hud-track stage-hud-track-enemy">
          <div className="hud-bar-inner">
            <div ref={eHpBarRef} className="stage-hud-fill stage-hud-fill-enemy" style={{ width: phase === 'idle' ? '100%' : undefined }} />
          </div>
          <img className="hud-bar-frame-img" src={`${BASE}ui/bar_frame.png`} alt="" />
          <span ref={eHpTextRef} className="stage-hud-text">—</span>
        </div>
      </div>

      {/* ── Victory / Defeat overlay ─── */}
      {(isWon || isLost) && (
        <div className={`stage-result ${isWon ? 'stage-result-won' : 'stage-result-lost'}`}>
          <span className="stage-result-text">{isWon ? 'Victory!' : 'Defeat'}</span>
        </div>
      )}

      {/* ── Player (left side) ─── */}
      <div ref={pRef} className={`stage-side ${isLost ? 'stage-ko' : ''}`}>
        <div ref={pFlashRef} className="stage-flash" />
        {pAnim === 'idle' && (
          <SpriteAnimator
            src={PLAYER_IDLE_SRC}
            frameWidth={PLAYER_IDLE_FW}
            frameHeight={PLAYER_IDLE_FH}
            frameCount={4}
            fps={isFighting ? 6 : 4}
            scale={spriteScale}
          />
        )}
        {pAnim === 'attack' && (
          <SpriteAnimator
            src={PLAYER_ATTACK_SRC}
            frameWidth={PLAYER_IDLE_FW}
            frameHeight={PLAYER_IDLE_FH}
            frameCount={4}
            fps={10}
            loop={false}
            onComplete={onPlayerAttackDone}
            scale={spriteScale}
          />
        )}
        {pAnim === 'hit' && (
          <SpriteAnimator
            src={PLAYER_HIT_SRC}
            frameWidth={PLAYER_IDLE_FW}
            frameHeight={PLAYER_IDLE_FH}
            frameCount={4}
            fps={12}
            loop={false}
            onComplete={onPlayerHitDone}
            scale={spriteScale}
          />
        )}
      </div>

      {/* ── Centre spacer ─── */}
      <div className="stage-centre" />

      {/* ── Damage number particles ─── */}
      {dmgNums.map(n => (
        <DamageNumber
          key={n.id}
          value={n.value}
          color={n.isEnemy ? 'gold' : 'red'}
          fontSize={n.fontSize}
          exploit={n.exploit}
          style={{ left: n.x, top: n.y }}
        />
      ))}

      {/* ── Drop orbs — pop from enemy, fall to ground, arc to player ─── */}
      {dropOrbs.map(orb => (
        <DropOrb
          key={orb.id}
          itemId={orb.itemId}
          qty={orb.qty}
          left={orb.left}
          top={orb.top}
          collectDx={orb.collectDx}
          collectDy={orb.collectDy}
          delay={orb.delay}
        />
      ))}

      {/* ── Enemy (right side, CSS-flipped to face left) ─── */}
      <div ref={eRef} className={`stage-side ${isWon ? 'stage-ko' : ''}`}>
        <div ref={eFlashRef} className="stage-flash" />
        {eAnim === 'idle' && (
          <SpriteAnimator
            {...enemyIdleProps}
            frameCount={4}
            fps={isFighting ? 6 : 4}
          />
        )}
        {eAnim === 'attack' && (
          <SpriteAnimator
            {...enemyAttackProps}
            frameCount={4}
            fps={10}
            loop={false}
            onComplete={onEnemyAttackDone}
          />
        )}
        {eAnim === 'hit' && (
          eHitSrc ? (
            <SpriteAnimator
              src={eHitSrc}
              frameWidth={128}
              frameHeight={128}
              frameCount={4}
              fps={12}
              loop={false}
              onComplete={onEnemyHitDone}
              scale={spriteScale}
            />
          ) : (
            <SpriteAnimator
              {...enemyIdleProps}
              frameCount={4}
              fps={isFighting ? 6 : 4}
            />
          )
        )}
      </div>

    </div>
  );
}
