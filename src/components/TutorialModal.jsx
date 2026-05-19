/**
 * TutorialModal — generic single-step instructional modal.
 *
 * Reusable for any "you just unlocked X — here's how it works" moment. The
 * first user is the crystal-evolution → new-mechanic flow, but the shape is
 * intentionally generic (title + body + optional icon + CTA) so it can be
 * dropped in for future onboarding beats (first artefact, first technique
 * slot, first ad boost, etc.).
 *
 * Lifecycle: caller queues the modal via the same useEventQueue() the rest of
 * the game's celebratory popups use. Closing fires onDone, which dismisses the
 * queue entry and lets the next event (if any) play.
 */
function TutorialModal({ title, body, ctaText = 'Got it', iconSrc, kicker = 'Unlocked', glowA, glowB, onDone }) {
  // Tier-tinted accent. When the modal is triggered by a crystal evolution,
  // the caller passes the same --ce-a/--ce-b colours the evolution overlay
  // used, so the celebration → tutorial sequence reads as one visual beat.
  const style = (glowA || glowB) ? {
    '--tut-a': glowA ?? 'rgba(120, 180, 235, 0.85)',
    '--tut-b': glowB ?? 'rgba(60, 130, 200, 0.45)',
  } : undefined;
  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-label={title} style={style}>
      <div className="tutorial-card">
        {iconSrc && (
          <div className="tutorial-icon-wrap">
            <img src={iconSrc} alt="" className="tutorial-icon" draggable="false" />
          </div>
        )}
        <div className="tutorial-kicker">{kicker}</div>
        <h2 className="tutorial-title">{title}</h2>
        <p className="tutorial-body">{body}</p>
        <button className="tutorial-cta" onClick={onDone} autoFocus>
          {ctaText}
        </button>
      </div>
    </div>
  );
}

export default TutorialModal;
