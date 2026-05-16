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

function RealmProgressBar({ qiRef, progressRef, costRef, gateRef, boosting, maxed, realmIndex, breakthrough, peakStage }) {
  // Cookie-Clicker pivot — bar fill is driven by `progressRef` (cumulative
  // qi earned this realm), NOT `qiRef` (spendable balance). qiRef is kept
  // in the prop list as a fallback for callers that haven't migrated yet.
  const sourceRef = progressRef ?? qiRef;
  const fillRef      = useRef(null);
  const fillInnerRef = useRef(null);
  const trackRef     = useRef(null);

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
      // During the major-breakthrough banner the qi has already drained into
      // the next realm and `cost` has advanced, which would snap the bar to
      // a tiny sliver mid-celebration. Hold it at 100% until the banner
      // dismisses so the bar visibly *completes* the realm.
      const pct = (maxed || breakthroughRef.current)
        ? 100
        : Math.min((sourceRef.current / costRef.current) * 100, 100);
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      // Inner gradient is inverse-scaled so it always spans the full channel,
      // regardless of fill width — anchors the bright core to a fixed
      // absolute position inside the bar instead of riding the fill.
      if (fillInnerRef.current) {
        fillInnerRef.current.style.width = pct > 0.05 ? `${10000 / pct}%` : '100%';
      }

      // ── Gate indicator (track shake / glow class) ────────────────────
      const isGated = !!gateRef?.current;
      if (isGated !== gatedPrev) {
        gatedPrev = isGated;
        if (trackRef.current) trackRef.current.classList.toggle('realm-track-gated', isGated);
      }

      // ── Fill colour — priority: breakthrough > gated/peak, with boost
      //    layered on top during gates so the player sees their hold is
      //    doing work while fighting through the qi/s threshold. Pure peak
      //    stage (no gate) still suppresses boost — peak is a resting
      //    state, not an active push. ────────────────────────────────────
      const bt     = !!breakthroughRef.current;
      const inPeak = !!peakStageRef.current;
      const pk     = !bt && (isGated || inPeak);
      const bst    = !bt && !!boostingRef.current && !(inPeak && !isGated);

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
  }, [qiRef, progressRef, costRef, gateRef, maxed]); // colour refs read live — no dep needed

  const frameSrc = `${BASE}ui/QI-Progress-Bar.png`;

  return (
    <div className="realm-bar">
      <div ref={trackRef} className="realm-track">
        <img className="qi-frame" src={frameSrc} alt="" draggable="false" />
        <div className="realm-channel">
          <div
            ref={fillRef}
            className="realm-fill"
            style={{ width: maxed ? '100%' : `${Math.min((sourceRef.current / costRef.current) * 100, 100)}%` }}
          >
            <div ref={fillInnerRef} className="realm-fill-inner" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealmProgressBar;
