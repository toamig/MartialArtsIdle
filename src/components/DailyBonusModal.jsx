import { useState } from 'react';
import { DAILY_REWARDS } from '../systems/dailyBonus';

const BASE = import.meta.env.BASE_URL;

export default function DailyBonusModal({ streak, todayReward, isAvailable, onCollect, onClose }) {
  const [collected, setCollected] = useState(false);
  const [awarded,   setAwarded]   = useState(0);

  const handleCollect = () => {
    const amount = onCollect();
    if (amount > 0) {
      setAwarded(amount);
      setCollected(true);
    }
  };

  return (
    <div className="daily-modal-overlay" onClick={onClose}>
      <div className="daily-modal" onClick={e => e.stopPropagation()}>

        <button className="daily-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="daily-modal-header">
          <img src={`${BASE}sprites/items/blood_lotus.png`} className="daily-modal-icon" alt="" draggable="false" />
          <div className="daily-modal-title">Daily Gift</div>
          <div className="daily-modal-sub">Return each day to grow your streak</div>
        </div>

        {/* 7-day grid */}
        <div className="daily-modal-grid">
          {DAILY_REWARDS.map((reward, i) => {
            const day       = i + 1;
            const isPast    = day < streak;
            const isToday   = day === streak;
            const isFuture  = day > streak;
            const isDone    = isPast || (isToday && (collected || !isAvailable));
            return (
              <div
                key={day}
                className={`daily-day${isToday ? ' daily-day-today' : ''}${isDone ? ' daily-day-done' : ''}${isFuture ? ' daily-day-future' : ''}`}
              >
                <span className="daily-day-label">Day {day}</span>
                <img src={`${BASE}sprites/items/blood_lotus.png`} className="daily-day-icon" alt="" draggable="false" />
                <span className="daily-day-reward">{reward}</span>
                {isDone && <span className="daily-day-check">✓</span>}
              </div>
            );
          })}
        </div>

        {/* Action area */}
        {collected ? (
          <div className="daily-modal-success">
            <span className="daily-modal-success-amount">+{awarded}</span>
            <img src={`${BASE}sprites/items/blood_lotus.png`} className="daily-modal-success-icon" alt="" draggable="false" />
            <span className="daily-modal-success-label">Blood Lotus collected!</span>
          </div>
        ) : isAvailable ? (
          <button className="daily-modal-collect" onClick={handleCollect}>
            Collect {todayReward}
            <img src={`${BASE}sprites/items/blood_lotus.png`} className="daily-modal-btn-icon" alt="" draggable="false" />
          </button>
        ) : (
          <div className="daily-modal-done">Come back tomorrow for Day {streak < 7 ? streak + 1 : 1}</div>
        )}

      </div>
    </div>
  );
}
