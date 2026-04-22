/**
 * Cultivation Qi progress bar — single complete bar frame (QI-Progress-Bar.png).
 * Fill updates every animation frame via direct DOM writes (no re-render).
 */
import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

function RealmProgressBar({ qiRef, costRef, gateRef, boosting, maxed, realmIndex }) {
  const fillRef  = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    let raf;
    let gatedFlag = false;
    const update = () => {
      const pct = maxed ? 100 : Math.min((qiRef.current / costRef.current) * 100, 100);
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;

      const isGated = !!gateRef?.current;
      if (isGated !== gatedFlag) {
        gatedFlag = isGated;
        if (trackRef.current) trackRef.current.classList.toggle('realm-track-gated', isGated);
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, gateRef, maxed]);

  useEffect(() => {
    if (fillRef.current)
      fillRef.current.classList.toggle('realm-fill-boosted', boosting);
  }, [boosting]);

  const frameSrc = `${BASE}ui/QI-Progress-Bar.png`;

  return (
    <div className="realm-bar">
      <div ref={trackRef} className="realm-track">
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
