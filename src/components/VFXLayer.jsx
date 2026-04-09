import { useState, useCallback, useRef } from 'react';

/**
 * VFXLayer - Manages and renders temporary visual effects.
 *
 * Usage:
 *   const { vfxLayer, spawnVFX } = useVFX();
 *
 *   spawnVFX({
 *     type: 'hit',           // CSS class applied: vfx-hit
 *     x: 100, y: 50,         // position relative to the VFXLayer
 *     duration: 500,          // ms before auto-removal
 *     content: '+10',         // text content (optional)
 *     sprite: { src, ... },   // SpriteAnimator props (optional)
 *   });
 *
 *   return <div style={{position:'relative'}}>{vfxLayer}</div>;
 *
 * Built-in VFX types (via CSS classes):
 *   vfx-hit       - quick scale-in flash
 *   vfx-float-up  - text floats upward and fades
 *   vfx-burst     - expanding ring burst
 */

import SpriteAnimator from './SpriteAnimator';

let vfxId = 0;

export function useVFX() {
  const [effects, setEffects] = useState([]);
  const timersRef = useRef([]);

  const spawnVFX = useCallback((config) => {
    const id = ++vfxId;
    const effect = { id, ...config };

    setEffects((prev) => [...prev, effect]);

    if (config.duration) {
      const timer = setTimeout(() => {
        setEffects((prev) => prev.filter((e) => e.id !== id));
      }, config.duration);
      timersRef.current.push(timer);
    }

    return id;
  }, []);

  const clearVFX = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setEffects([]);
  }, []);

  const vfxLayer = (
    <div className="vfx-layer">
      {effects.map((effect) => (
        <div
          key={effect.id}
          className={`vfx-effect ${effect.type ? `vfx-${effect.type}` : ''}`}
          style={{
            left: effect.x,
            top: effect.y,
          }}
        >
          {effect.content && (
            <span className="vfx-content">{effect.content}</span>
          )}
          {effect.sprite && <SpriteAnimator {...effect.sprite} loop={false} />}
        </div>
      ))}
    </div>
  );

  return { vfxLayer, spawnVFX, clearVFX };
}
