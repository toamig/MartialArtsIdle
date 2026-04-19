import { useState } from 'react';
import { ACHIEVEMENTS, CATEGORIES, CATEGORY_LABELS } from '../data/achievements';

function AchievementCard({ achievement, unlocked }) {
  return (
    <div className={`ach-card${unlocked ? ' ach-card-unlocked' : ' ach-card-locked'}`}>
      <div className="ach-card-icon">{achievement.icon}</div>
      <div className="ach-card-body">
        <div className="ach-card-title">{achievement.title}</div>
        <div className="ach-card-desc">{unlocked ? achievement.desc : '???'}</div>
      </div>
      {unlocked && <div className="ach-card-check">✓</div>}
    </div>
  );
}

function AchievementsModal({ achievements, onClose }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter(a => a.category === activeCategory);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="achievements-modal" onClick={e => e.stopPropagation()}>
        <div className="ach-modal-header">
          <div className="ach-modal-title">
            <span className="ach-modal-trophy">🏆</span>
            Achievements
          </div>
          <div className="ach-modal-progress">
            {achievements.unlockedCount} / {achievements.totalCount}
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ach-progress-bar">
          <div
            className="ach-progress-fill"
            style={{ width: `${(achievements.unlockedCount / achievements.totalCount) * 100}%` }}
          />
        </div>

        <div className="ach-tabs">
          <button
            className={`ach-tab${activeCategory === 'all' ? ' ach-tab-active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`ach-tab${activeCategory === cat ? ' ach-tab-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="ach-list">
          {filtered.map(a => (
            <AchievementCard
              key={a.id}
              achievement={a}
              unlocked={achievements.isUnlocked(a.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AchievementsModal;
