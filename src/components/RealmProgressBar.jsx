/**
 * Vertical progress bar whose fill and qi label update every animation frame
 * by reading directly from qiRef/costRef — no React re-render needed.
 */
import { useEffect, useRef } from 'react';

function formatQi(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(n);
}

function RealmProgressBar({ qiRef, costRef, currentRealm, nextRealm, boosting }) {
  const fillRef    = useRef(null);
  const qiLabelRef = useRef(null);

  // Update fill height and qi label every frame — directly in the DOM
  useEffect(() => {
    let raf;
    const update = () => {
      const qi   = qiRef.current;
      const cost = costRef.current;
      const pct  = Math.min((qi / cost) * 100, 100);

      if (fillRef.current)    fillRef.current.style.height = `${pct}%`;
      if (qiLabelRef.current) qiLabelRef.current.textContent =
        `${formatQi(Math.floor(qi))} / ${formatQi(cost)}`;

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef]);

  // Boosting class only changes on pointer events — fine as a React prop
  useEffect(() => {
    if (fillRef.current)
      fillRef.current.classList.toggle('realm-fill-boosted', boosting);
  }, [boosting]);

  return (
    <div className="realm-bar">
      <div className="realm-label realm-next">{nextRealm}</div>
      <div className="realm-track">
        <div ref={fillRef} className="realm-fill" style={{ height: '0%' }} />
        <div ref={qiLabelRef} className="realm-qi-label" />
      </div>
      <div className="realm-label realm-current">{currentRealm}</div>
    </div>
  );
}

export default RealmProgressBar;
