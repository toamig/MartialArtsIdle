import { useRef, useEffect, useState } from 'react';
import SpriteAnimator from './SpriteAnimator';
import { getSprites, FW, FH } from '../sprites/spriteGen';

const BASE = import.meta.env.BASE_URL;

// Custom player idle: 128×128 px per frame, displayed at 1.5× = 192×192
const PLAYER_IDLE_SRC    = `${BASE}sprites/combat/player-idle.png`;
const PLAYER_IDLE_FW     = 128;
const PLAYER_IDLE_FH     = 128;
const PLAYER_IDLE_SCALE  = 1.5;

// Canvas-generated attack / enemy sprites: 32×40, displayed at 3×
const GEN_SCALE = 3;

/**
 * CombatStage — two fighters, strictly turn-based animations.
 *
 * Player idle uses the custom sprite sheet.
 * Attack animations use canvas-generated sprites (temporary until custom assets arrive).
 *
 * Turn handoff:
 *   useCombat calls playerAttackRef  → we play attack anim
 *   when attack anim ends            → we call playerAnimDoneRef (useCombat advances turn)
 *   useCombat calls enemyAttackRef   → we play enemy attack anim
 *   when enemy anim ends             → we call enemyAnimDoneRef
 */
export default function CombatStage({
  phase,
  playerAttackRef,
  enemyAttackRef,
  playerAnimDoneRef,
  enemyAnimDoneRef,
}) {
  const sprites = getSprites();

  const [pAnim, setPAnim] = useState('idle');
  const [eAnim, setEAnim] = useState('idle');

  const pRef     = useRef(null);
  const eRef     = useRef(null);
  const pFlashRef = useRef(null);
  const eFlashRef = useRef(null);

  const isFighting = phase === 'fighting';
  const isWon      = phase === 'won';
  const isLost     = phase === 'lost';

  useEffect(() => {
    // Called by useCombat when it's the player's turn to attack
    playerAttackRef.current = () => {
      setPAnim('attack');
      pRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(20px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
      eFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255,255,255,0.8)' },
          { opacity: 0, background: 'rgba(255,255,255,0)' },
        ],
        { duration: 250, easing: 'ease-out' },
      );
    };

    // Called by useCombat when it's the enemy's turn to attack
    enemyAttackRef.current = () => {
      setEAnim('attack');
      eRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-20px)', offset: 0.4 },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-in-out' },
      );
      pFlashRef.current?.animate(
        [
          { opacity: 1, background: 'rgba(255,80,60,0.65)' },
          { opacity: 0, background: 'rgba(255,80,60,0)' },
        ],
        { duration: 250, easing: 'ease-out' },
      );
    };

    return () => {
      playerAttackRef.current = null;
      enemyAttackRef.current  = null;
    };
  }, [playerAttackRef, enemyAttackRef]);

  // Snap both back to idle when fight ends
  useEffect(() => {
    if (phase !== 'fighting') {
      setPAnim('idle');
      setEAnim('idle');
    }
  }, [phase]);

  // Player attack animation complete → tell useCombat to advance turn
  const onPlayerAttackDone = () => {
    setPAnim('idle');
    playerAnimDoneRef.current?.();
  };

  // Enemy attack animation complete → tell useCombat to advance turn
  const onEnemyAttackDone = () => {
    setEAnim('idle');
    enemyAnimDoneRef.current?.();
  };

  return (
    <div className={`combat-stage ${isFighting ? 'stage-fighting' : ''}`}>

      {/* ── Player (left side) ─── */}
      <div ref={pRef} className={`stage-side ${isLost ? 'stage-ko' : ''}`}>
        <div ref={pFlashRef} className="stage-flash" />
        {pAnim === 'idle' ? (
          <SpriteAnimator
            src={PLAYER_IDLE_SRC}
            frameWidth={PLAYER_IDLE_FW}
            frameHeight={PLAYER_IDLE_FH}
            frameCount={4}
            fps={isFighting ? 6 : 4}
            scale={PLAYER_IDLE_SCALE}
          />
        ) : (
          <SpriteAnimator
            src={sprites.playerAttack}
            frameWidth={FW}
            frameHeight={FH}
            frameCount={4}
            fps={10}
            loop={false}
            onComplete={onPlayerAttackDone}
            scale={GEN_SCALE}
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
        <SpriteAnimator
          src={eAnim === 'attack' ? sprites.enemyAttack : sprites.enemyIdle}
          frameWidth={FW}
          frameHeight={FH}
          frameCount={4}
          fps={eAnim === 'attack' ? 10 : (isFighting ? 6 : 4)}
          loop={eAnim !== 'attack'}
          onComplete={eAnim === 'attack' ? onEnemyAttackDone : undefined}
          scale={GEN_SCALE}
          className="sprite-flipped"
        />
      </div>

    </div>
  );
}
