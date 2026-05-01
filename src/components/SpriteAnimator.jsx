import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * SpriteAnimator - Renders animations from sprite sheets.
 *
 * Props:
 *   src         - URL of the sprite sheet image
 *   frameWidth  - width of a single frame in px
 *   frameHeight - height of a single frame in px
 *   frameCount  - total number of frames in the animation
 *   columns     - number of columns in the sprite sheet (defaults to frameCount for single-row sheets)
 *   fps         - frames per second (default 12)
 *   loop        - whether to loop (default true)
 *   playing     - whether animation is playing (default true)
 *   scale       - render scale multiplier (default 1)
 *   startFrame  - frame index to start from (default 0)
 *   onComplete  - callback fired when a non-looping animation ends
 *   onFrame     - callback fired on each frame change, receives frame index
 *   style       - additional CSS styles
 *   className   - additional CSS class
 */
function SpriteAnimator({
  src,
  frameWidth,
  frameHeight,
  frameCount,
  columns,
  fps = 12,
  loop = true,
  playing = true,
  scale = 1,
  startFrame = 0,
  onComplete,
  onFrame,
  style,
  className,
}) {
  const [frame, setFrame] = useState(startFrame);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const frameRef = useRef(startFrame);
  // Keep onComplete/onFrame in refs so they're always current without
  // being useCallback dependencies — prevents animate from being recreated
  // (and the effect from restarting) on every parent re-render.
  const onCompleteRef = useRef(onComplete);
  const onFrameRef    = useRef(onFrame);
  const firedRef      = useRef(false); // guard against double-complete
  onCompleteRef.current = onComplete;
  onFrameRef.current    = onFrame;

  const cols = columns || frameCount;
  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;

  const animate = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const delta = timestamp - lastTimeRef.current;
    const interval = 1000 / fps;

    if (delta >= interval) {
      lastTimeRef.current = timestamp - (delta % interval);
      const nextFrame = frameRef.current + 1;

      if (nextFrame >= frameCount) {
        if (loop) {
          frameRef.current = 0;
        } else {
          if (!firedRef.current) {
            firedRef.current = true;
            onCompleteRef.current?.();
          }
          return;
        }
      } else {
        frameRef.current = nextFrame;
      }

      setFrame(frameRef.current);
      onFrameRef.current?.(frameRef.current);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [fps, frameCount, loop]); // onComplete/onFrame removed — read from refs above

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, animate]);

  // Reset when src or startFrame changes
  useEffect(() => {
    frameRef.current = startFrame;
    firedRef.current = false;
    setFrame(startFrame);
  }, [src, startFrame]);

  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const bgX = -(col * frameWidth * scale);
  const bgY = -(row * frameHeight * scale);

  return (
    <div
      className={`sprite-animator ${className || ''}`}
      style={{
        width: displayWidth,
        height: displayHeight,
        backgroundImage: `url(${src})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${cols * displayWidth}px auto`,
        backgroundRepeat: 'no-repeat',
        willChange: 'background-position',
        ...style,
      }}
    />
  );
}

export default SpriteAnimator;
