import { useRef, useEffect, useState } from 'react';
import SpriteAnimator from './SpriteAnimator';
import { getSprites, FW, FH } from '../sprites/spriteGen';

const BASE = import.meta.env.BASE_URL;

// Custom player sprites: 128×128 px per frame, displayed at 1.5×
const PLAYER_IDLE_SRC   = `${BASE}sprites/combat/player-idle.png`;
const PLAYER_ATTACK_SRC = `${BASE}sprites/combat/player-attack.png`;
const PLAYER_HIT_SRC    = `${BASE}sprites/combat/player-hit.png`;
const PLAYER_IDLE_FW    = 128;
const PLAYER_IDLE_FH    = 128;
const PLAYER_IDLE_SCALE = 1.5;

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
export default function CombatStage({
  phase,
  enemy,
  playerAttackRef,
  enemyAttackRef,
  playerAnimDoneRef,
  enemyAnimDoneRef,
}) {
  const sprites = getSprites();

  const [pAnim, setPAnim] = useState('idle');
  const [eAnim, setEAnim] = useState('idle');

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
  const enemyIdleProps  = hasCustomEnemy
    ? { src: eIdleSrc,   frameWidth: 128, frameHeight: 128, scale: PLAYER_IDLE_SCALE }
    : { src: sprites.enemyIdle,   frameWidth: FW, frameHeight: FH, scale: GEN_SCALE };

  const enemyAttackProps = hasCustomEnemy
    ? { src: eAttackSrc, frameWidth: 128, frameHeight: 128, scale: PLAYER_IDLE_SCALE }
    : { src: sprites.enemyAttack, frameWidth: FW, frameHeight: FH, scale: GEN_SCALE };

  return (
    <div className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}>

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
            scale={PLAYER_IDLE_SCALE}
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
            scale={PLAYER_IDLE_SCALE}
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
            scale={PLAYER_IDLE_SCALE}
          />
        )}
      </div>

      {/* ── Centre ─── */}
      <div className="stage-centre">
        {isFighting && <span className="stage-clash">⚔</span>}
      </div>

      {/* ── Enemy (right side, CSS-flipped to face left) ─── */}
      <div ref={eRef} className={`stage-side ${isWon ? 'stage-ko' : ''}`}>
        <div ref={eFlashRef} className="stage-flash" />
        {eAnim === 'idle' && (
          <SpriteAnimator
            {...enemyIdleProps}
            frameCount={4}
            fps={isFighting ? 6 : 4}
            className="sprite-flipped"
          />
        )}
        {eAnim === 'attack' && (
          <SpriteAnimator
            {...enemyAttackProps}
            frameCount={4}
            fps={10}
            loop={false}
            onComplete={onEnemyAttackDone}
            className="sprite-flipped"
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
              scale={PLAYER_IDLE_SCALE}
              className="sprite-flipped"
            />
          ) : (
            // No custom hit sprite — fall back to idle and let the flash handle it
            <SpriteAnimator
              {...enemyIdleProps}
              frameCount={4}
              fps={isFighting ? 6 : 4}
              className="sprite-flipped"
            />
          )
        )}
      </div>

    </div>
  );
}
