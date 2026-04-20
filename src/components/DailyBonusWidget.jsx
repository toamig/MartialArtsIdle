const BASE = import.meta.env.BASE_URL;

export default function DailyBonusWidget({ streak, todayReward, isAvailable, onOpen }) {
  return (
    <button
      className={`daily-widget${isAvailable ? ' daily-widget-available' : ''}`}
      onClick={onOpen}
      aria-label="Daily Gift"
    >
      {isAvailable && <span className="daily-widget-badge" />}
      <img src={`${BASE}sprites/items/blood_lotus.png`} className="daily-widget-icon" alt="" draggable="false" />
      <span className="daily-widget-text">Daily Gift</span>
      <span className="daily-widget-day">Day {streak}</span>
    </button>
  );
}
