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

function formatRate(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (n >= 10)  return n.toFixed(0);
  return n.toFixed(1);
}

function RealmProgressBar({ qiRef, costRef, rateRef, gateRef, currentRealm, nextRealm, boosting, maxed, realmIndex }) {
  const fillRef        = useRef(null);
  const qiCurrentRef   = useRef(null);
  const qiCostRef      = useRef(null);
  const gateLabelRef   = useRef(null);
  const trackRef       = useRef(null);

  // Update fill width and qi label every frame — direct DOM, no React re-render
  useEffect(() => {
    let raf;
    let gatedFlag = false;
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

      // Major-realm gate overlay — shown only when the cultivation loop has
      // capped qi at cost because qi/s is below the transition threshold.
      const gate = gateRef?.current;
      const isGated = !!gate;
      if (isGated && gateLabelRef.current) {
        const r = rateRef ? rateRef.current : gate.current;
        gateLabelRef.current.textContent = `⛔ Qi/s ${formatRate(r)} / ${formatRate(gate.required)}`;
      }
      if (isGated !== gatedFlag) {
        gatedFlag = isGated;
        if (trackRef.current) trackRef.current.classList.toggle('realm-track-gated', isGated);
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, rateRef, gateRef, maxed]);

  // Boosting glow only changes on pointer events — fine as a React prop
  useEffect(() => {
    if (fillRef.current)
      fillRef.current.classList.toggle('realm-fill-boosted', boosting);
  }, [boosting]);

  const frameSrc = `${BASE}ui/QI-Progress-Bar.png`;

  return (
    <div className="realm-bar">
      {/* Frame: complete bar image, no mirroring needed */}
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
        <div ref={gateLabelRef} className="realm-gate-label" aria-live="polite" />
      </div>
    </div>
  );
}

export default RealmProgressBar;
