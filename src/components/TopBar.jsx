import { useRef, useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

export default function TopBar({
  bloodLotusBalance,
  onOpenShop,
  onOpenJourney,
  onOpenAchievements,
  onOpenSettings,
  hasNewAchievement,
  activeModal,
  onOpenReincarnation,
  reincarnationUnlocked,
  onOpenCrystal,
  crystalUnlocked,
  realmName,
  realmStage,
}) {
  return (
    <div className="top-bar">
      <button
        className={`home-hud-blood-lotus${activeModal === 'shop' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenShop}
        aria-label="Blood Lotus Shop"
      >
        <img
          src={`${BASE}sprites/items/blood_lotus.png`}
          className="home-hud-blood-lotus-icon"
          alt=""
          draggable="false"
        />
        <span className="home-hud-blood-lotus-amount">{bloodLotusBalance ?? 0}</span>
      </button>
      {realmName && (
        <div className="topbar-realm">
          <span className="topbar-realm-name">{realmName.split(' - ')[0]}</span>
          {realmStage && <span className="topbar-realm-stage">{realmStage}</span>}
        </div>
      )}
      <div className="home-hud-spacer" />
      {reincarnationUnlocked && (
        <button
          className="home-hud-reinc"
          onClick={onOpenReincarnation}
          aria-label="Reincarnation"
        >
          ☸
        </button>
      )}
      {crystalUnlocked && (
        <button
          className="home-hud-crystal"
          onClick={onOpenCrystal}
          aria-label="Qi Crystal"
        >
          🪨
        </button>
      )}
      <button
        className={`home-hud-journey${activeModal === 'journey' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenJourney}
        aria-label="Cultivation Journey"
      >
        🗺️
      </button>
      <button
        className={`home-hud-trophy${activeModal === 'achievements' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenAchievements}
        aria-label="Achievements"
      >
        🏆
        {hasNewAchievement && <span className="home-hud-trophy-badge" />}
      </button>
      <button
        className={`home-hud-settings${activeModal === 'settings' ? ' top-bar-btn--active' : ''}`}
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
