import { useRef, useEffect, useState } from 'react';
import SpriteAnimator from './SpriteAnimator';
import DamageNumber from './DamageNumber';
import { getSprites, FW, FH } from '../sprites/spriteGen';

const BASE = import.meta.env.BASE_URL;

// Custom player sprites: 128×128 px per frame
const PLAYER_IDLE_SRC   = `${BASE}sprites/combat/player-idle.png`;
const PLAYER_ATTACK_SRC = `${BASE}sprites/combat/player-attack.png`;
const PLAYER_HIT_SRC    = `${BASE}sprites/combat/player-hit.png`;
const PLAYER_IDLE_FW    = 128;
const PLAYER_IDLE_FH    = 128;

// Responsive scale: shrink on narrow mobile so both fighters fit the stage.
// 128px × 1.5 = 192px per fighter × 2 + 40px padding = ~424px → overflows 375px screens.
// 128px × 1.2 = 154px per fighter × 2 + 16px padding = ~324px → fits comfortably.
function getSpriteScale() {
  if (typeof window === 'undefined') return 1.5;
  return window.innerWidth <= 430 ? 1.2 : 1.5;
}

// Canvas-generated sprites: 32×40, displayed at 3×
const GEN_SCALE = 3;

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
  pHpBarRef,
  pHpTextRef,
  eHpBarRef,
  eHpTextRef,
}) {
  const sprites = getSprites();
  const spriteScale = getSpriteScale();

  const [pAnim, setPAnim] = useState('idle');
  const [eAnim, setEAnim] = useState('idle');
  const [dmgNums, setDmgNums] = useState([]);
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

  // Register the damage-number spawn callback so useCombat can trigger it.
  // Enemy damage (gold) spawns on the right side; player damage taken (red) on the left.
  useEffect(() => {
    if (!spawnDamageNumberRef) return;
    spawnDamageNumberRef.current = (value, side) => {
      const id = ++dmgId;
      const isEnemy = side === 'enemy';
      const x = isEnemy
        ? `${62 + Math.random() * 16}%`
        : `${8  + Math.random() * 14}%`;
      const y = 80 + Math.random() * 55;
      setDmgNums(prev => [...prev, { id, value, x, y, isEnemy }]);
      const t = setTimeout(
        () => setDmgNums(prev => prev.filter(n => n.id !== id)),
        1000,
      );
      dmgTimersRef.current.push(t);
    };
    return () => {
      spawnDamageNumberRef.current = null;
      dmgTimersRef.current.forEach(clearTimeout);
      dmgTimersRef.current = [];
    };
  }, [spawnDamageNumberRef]);

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
      className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}
      style={{ backgroundImage: `url(${BASE}backgrounds/world_${worldId}.png)` }}
    >

      {/* ── Player HUD (top-left) ─── */}
      <div className="stage-hud stage-hud-player">
        <span className="stage-hud-name">You</span>
        <div className="stage-hud-track">
          <div ref={pHpBarRef} className="stage-hud-fill stage-hud-fill-player" style={{ width: '100%' }} />
        </div>
        <span ref={pHpTextRef} className="stage-hud-text">—</span>
      </div>

      {/* ── Enemy HUD (top-right) ─── */}
      <div className="stage-hud stage-hud-enemy">
        <span className="stage-hud-name">{enemy?.name || 'Enemy'}</span>
        <div className="stage-hud-track">
          <div ref={eHpBarRef} className="stage-hud-fill stage-hud-fill-enemy" style={{ width: phase === 'idle' ? '100%' : undefined }} />
        </div>
        <span ref={eHpTextRef} className="stage-hud-text">—</span>
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

      {/* ── Centre ─── */}
      <div className="stage-centre">
        {isFighting && <span className="stage-clash">⚔</span>}
      </div>

      {/* ── Damage number particles ─── */}
      {dmgNums.map(n => (
        <DamageNumber
          key={n.id}
          value={n.value}
          color={n.isEnemy ? 'gold' : 'red'}
          style={{ left: n.x, top: n.y }}
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
