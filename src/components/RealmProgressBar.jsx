/**
 * Cultivation Qi progress bar — single complete bar frame (QI-Progress-Bar.png).
 * Fill updates every animation frame via direct DOM writes (no re-render).
 *
 * Color priority (highest wins):
 *   breakthrough  — active banner event (white-violet pulse)
 *   gated/peak    — player is gated waiting on qi/s OR is already in a peak stage (crimson-gold pulse)
 *   boosted       — hold-to-cultivate active (bright gold)
 *   normal        — default amber gradient
 */
import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

function RealmProgressBar({ qiRef, costRef, gateRef, boosting, maxed, realmIndex, breakthrough, peakStage }) {
  const fillRef  = useRef(null);
  const trackRef = useRef(null);

  // Mirror React props into refs so the RAF closure always reads current values
  // without needing to be re-created on every prop change.
  const breakthroughRef = useRef(breakthrough);
  const peakStageRef    = useRef(peakStage);
  const boostingRef     = useRef(boosting);
  useEffect(() => { breakthroughRef.current = breakthrough; }, [breakthrough]);
  useEffect(() => { peakStageRef.current    = peakStage;    }, [peakStage]);
  useEffect(() => { boostingRef.current     = boosting;     }, [boosting]);

  useEffect(() => {
    let raf;
    // Previous-frame flags — only write to the DOM when something changed.
    let gatedPrev = false;
    let btPrev    = false;
    let pkPrev    = false;
    let bstPrev   = false;

    const update = () => {
      // ── Bar width ───────────────────────────────────────────────────────
      const pct = maxed ? 100 : Math.min((qiRef.current / costRef.current) * 100, 100);
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;

      // ── Gate indicator (track shake / glow class) ────────────────────
      const isGated = !!gateRef?.current;
      if (isGated !== gatedPrev) {
        gatedPrev = isGated;
        if (trackRef.current) trackRef.current.classList.toggle('realm-track-gated', isGated);
      }

      // ── Fill colour — priority: breakthrough > gated/peak > boosted ──
      // "gated" covers both major-realm gates and peak-stage gates; in both
      // cases the player is actively fighting to raise their qi/s so the bar
      // should signal urgency the whole time the gate is open.
      const bt  = !!breakthroughRef.current;
      const pk  = !bt && (isGated || !!peakStageRef.current);
      const bst = !bt && !pk && !!boostingRef.current;

      if (bt !== btPrev || pk !== pkPrev || bst !== bstPrev) {
        btPrev = bt; pkPrev = pk; bstPrev = bst;
        if (fillRef.current) {
          fillRef.current.classList.toggle('realm-fill-breakthrough', bt);
          fillRef.current.classList.toggle('realm-fill-peak-stage',   pk);
          fillRef.current.classList.toggle('realm-fill-boosted',      bst);
        }
      }

      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [qiRef, costRef, gateRef, maxed]); // colour refs read live — no dep needed

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
