/**
 * Vertical progress bar showing cultivation progress.
 * Current realm at bottom, next realm at top.
 */
function RealmProgressBar({ progress, currentRealm, nextRealm, qi, cost, boosting }) {
  const percent = Math.min(progress * 100, 100);

  return (
    <div className="realm-bar">
      <div className="realm-label realm-next">{nextRealm}</div>
      <div className="realm-track">
        <div
          className={`realm-fill ${boosting ? 'realm-fill-boosted' : ''}`}
          style={{ height: `${percent}%` }}
        />
        <div className="realm-qi-label">
          {qi} / {cost}
        </div>
      </div>
      <div className="realm-label realm-current">{currentRealm}</div>
    </div>
  );
}

export default RealmProgressBar;
