/**
 * Cultivation Qi progress bar — decorative half-bar frame mirrored in CSS.
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

function RealmProgressBar({ qiRef, costRef, currentRealm, nextRealm, boosting, maxed }) {
  const fillRef    = useRef(null);
  const qiLabelRef = useRef(null);

  // Update fill width and qi label every frame — direct DOM, no React re-render
  useEffect(() => {
    let raf;
    const update = () => {
      if (maxed) {
        if (fillRef.current)    fillRef.current.style.width = '100%';
        if (qiLabelRef.current) qiLabelRef.current.textContent = 'Peak';
        raf = requestAnimationFrame(update);
        return;
      }

      const qi   = qiRef.current;
      const cost = costRef.current;
      const pct  = Math.min((qi / cost) * 100, 100);

      if (fillRef.current)    fillRef.current.style.width = `${pct}%`;
      if (qiLabelRef.current) qiLabelRef.current.textContent =
        `${formatQi(Math.floor(qi))} / ${formatQi(cost)}`;

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

  const frameSrc = `${BASE}ui/qi_bar_red.png`;

  return (
    <div className="realm-bar">
      {/* Single centered stage label above the bar — no clutter at the ends. */}
      <div className="realm-stage-title">{currentRealm}</div>

      {/* Frame: two mirrored halves side-by-side at width:50% each */}
      <div className="realm-track">
        <img className="qi-frame-left"  src={frameSrc} alt="" draggable="false" />
        <img className="qi-frame-right" src={frameSrc} alt="" draggable="false" />

        {/* Fill sits behind the frame, clipped to the transparent channel region */}
        <div
          ref={fillRef}
          className="realm-fill"
          style={{ width: maxed ? '100%' : `${Math.min((qiRef.current / costRef.current) * 100, 100)}%` }}
        />
        <div ref={qiLabelRef} className="realm-qi-label" />
      </div>
    </div>
  );
}

export default RealmProgressBar;
