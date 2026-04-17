/**
 * Cultivation Qi progress bar — single complete bar frame (QI-Progress-Bar.png).
 * Fill and qi label update every animation frame via direct DOM writes (no re-render).
 */
import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

function formatQi(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return String(n);
}

function RealmProgressBar({ qiRef, costRef, currentRealm, nextRealm, boosting, maxed, realmIndex }) {
  const fillRef        = useRef(null);
  const qiCurrentRef   = useRef(null);
  const qiCostRef      = useRef(null);

  // Update fill width and qi label every frame — direct DOM, no React re-render
  useEffect(() => {
    let raf;
    const update = () => {
      if (maxed) {
        if (fillRef.current)      fillRef.current.style.width = '100%';
        if (qiCurrentRef.current) qiCurrentRef.current.textContent = 'Peak';
        if (qiCostRef.current)    qiCostRef.current.textContent = '';
        raf = requestAnimationFrame(update);
        return;
      }

      const qi   = qiRef.current;
      const cost = costRef.current;
      const pct  = Math.min((qi / cost) * 100, 100);

      if (fillRef.current)      fillRef.current.style.width = `${pct}%`;
      if (qiCurrentRef.current) qiCurrentRef.current.textContent = formatQi(Math.floor(qi));
      if (qiCostRef.current)    qiCostRef.current.textContent = formatQi(cost);

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, maxed]);

  // Boosting glow only changes on pointer events — fine as a React prop
  useEffect(() => {
    if (fillRef.current)
      fillRef.current.classList.toggle('realm-fill-boosted', boosting);
  }, [boosting]);

  const frameSrc = `${BASE}ui/QI-Progress-Bar.png`;

  return (
    <div className="realm-bar">
      {/* Frame: complete bar image, no mirroring needed */}
      <div className="realm-track">
        <img className="qi-frame" src={frameSrc} alt="" draggable="false" />
        <div className="realm-channel">
          <div
            ref={fillRef}
            className="realm-fill"
            style={{ width: maxed ? '100%' : `${Math.min((qiRef.current / costRef.current) * 100, 100)}%` }}
          />
        </div>
        <div className="realm-center-badge">{realmIndex + 1}</div>
      </div>
    </div>
  );
}

export default RealmProgressBar;
