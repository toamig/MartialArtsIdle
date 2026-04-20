import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioManager } from '../audio';
import WORLDS from '../data/worlds';
import ENEMIES from '../data/enemies';
import { preloadEnemySprites } from '../utils/preload';
import { isWorldUnlocked, getWorldLockHint } from '../data/featureGates';
import LockTooltip from '../components/LockTooltip';
import { ALL_MATERIALS } from '../data/materials';

const BASE = import.meta.env.BASE_URL;

// Shows the first idle frame of an enemy sprite as a small card.
// The idle sheet is 512×128 (4 frames). We clip to the first 128×128
// by setting the img width to 4× the display size and anchoring left.
function EnemyChip({ enemyId }) {
  const { t: tGame } = useTranslation('game');
  const def = ENEMIES[enemyId];
  if (!def?.sprite) return null;

  const displaySize = 52;
  const sheetWidth  = displaySize * 4; // 4 frames side by side
  const enemyName   = tGame(`enemies.${enemyId}.name`, { defaultValue: def.name });

  return (
    <div className="enemy-chip">
      <div
        className="enemy-chip-sprite"
        style={{ width: displaySize, height: displaySize }}
      >
        <img
          src={`${BASE}sprites/enemies/${def.sprite}-idle.png`}
          alt={enemyName}
          style={{ width: sheetWidth, height: displaySize }}
        />
      </div>
      <span className="enemy-chip-name">{enemyName}</span>
    </div>
  );
}

function LootBanner({ pendingGains, onCollect }) {
  const items = Object.entries(pendingGains?.items ?? {}).filter(([, qty]) => qty > 0);
  const techCount = pendingGains?.techniques?.length ?? 0;
  if (items.length === 0 && techCount === 0) return null;

  return (
    <div className="loot-banner">
      <div className="loot-banner-header">
        <span className="loot-banner-title">Loot Ready</span>
        <button className="loot-collect-btn" onClick={onCollect}>
          Collect All
        </button>
      </div>
      <div className="loot-banner-items">
        {items.map(([id, qty]) => {
          const mat = ALL_MATERIALS[id];
          const name = mat?.name ?? id;
          return (
            <span key={id} className="loot-banner-item">
              {name} ×{qty}
            </span>
          );
        })}
        {techCount > 0 && (
          <span className="loot-banner-item loot-banner-item-tech">
            +{techCount} Technique{techCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}

const TAB_ACTIVITY = { world: 'combat', gather: 'gathering', mine: 'mining' };
const ACTIVITY_ICON = { combat: '⚔', gathering: '🌿', mining: '⛏' };

function RegionRow({ region, tab, locked, lockHint, combatLocked, onNavigate, worldId,
                     canIdle, isIdling, isLastIdle, onSetIdle, onClearIdle,
                     pendingGains, hasPendingGains, onCollect }) {
  const { t } = useTranslation('ui');
  const { t: tGame }  = useTranslation('game');

  const isWorld = tab === 'world';

  // Deduplicate enemy IDs (a pool may have the same enemy at different weights).
  const enemyIds = isWorld
    ? [...new Set((region.enemyPool ?? []).map(e => e.enemyId))]
    : [];

  // Resolve a list of drop entries ({ itemId }) into human-readable, deduped
  // material names using the game-items i18n namespace.
  const dropNames = (entries) => {
    const seen = new Set();
    const names = [];
    for (const e of entries ?? []) {
      if (!e?.itemId || seen.has(e.itemId)) continue;
      seen.add(e.itemId);
      const mat = ALL_MATERIALS[e.itemId];
      const name = mat
        ? tGame(`items.${e.itemId}.name`, { defaultValue: mat.name })
        : e.itemId;
      names.push(name);
    }
    return names;
  };

  // Combat drops are per-enemy (enemies.js); gather/mine drops live on
  // the region itself. Build the right list depending on the active tab.
  const tabDropNames = isWorld
    ? dropNames(enemyIds.flatMap(id => ENEMIES[id]?.drops ?? []))
    : tab === 'gather'
    ? dropNames(region.gatherDrops)
    : dropNames(region.mineDrops);

  const content = { secondary: tabDropNames.length
    ? `${t('worlds.drops')} ${tabDropNames.join(', ')}`
    : null };

  const regionName    = locked ? '???' : tGame(`regions.${region.name}.name`, { defaultValue: region.name });
  const minRealmLabel = tGame(`stages.${region.minRealm}.name`, { defaultValue: region.minRealm });

  function handleClick() {
    if (!isWorld) return;
    const sprites = [...new Set(
      (region.enemyPool ?? []).map(e => ENEMIES[e.enemyId]?.sprite).filter(Boolean)
    )];
    sprites.forEach(sprite => preloadEnemySprites(sprite));
    onNavigate('combat-arena', { region, worldId, fromTab: tab });
  }

  function handleIdleClick(e) {
    e.stopPropagation();
    if (isIdling) { AudioManager.playSfx('ui_click'); onClearIdle(); }
    else          { AudioManager.playSfx('ui_confirm'); onSetIdle(); }
  }

  return (
    <div
      className={`region-row${locked ? ' region-locked' : ''}${isWorld && !locked ? ' region-row-world' : ''}${isIdling ? ' region-row-idling' : ''}`}
      onClick={isWorld && !locked ? handleClick : undefined}
      role={isWorld && !locked ? 'button' : undefined}
      title={locked && lockHint ? lockHint : undefined}
    >
      <div className="region-row-left">
        <div className="region-row-info">
          <span className="region-name">{regionName}</span>
          <span className="region-min-realm">{minRealmLabel}</span>
        </div>
        {!locked && content.secondary && (
          <div className="region-row-detail">
            <span className="region-detail-secondary">{content.secondary}</span>
          </div>
        )}
        {combatLocked && (
          <div className="region-combat-gate">⚔ Clear combat first</div>
        )}
        {isLastIdle && hasPendingGains && pendingGains && (
          <div className="region-pending-summary">
            {[
              ...Object.entries(pendingGains.items ?? {})
                .filter(([, qty]) => qty > 0)
                .map(([id, qty]) => {
                  const mat = ALL_MATERIALS[id];
                  return `${mat?.name ?? id} ×${qty}`;
                }),
              ...(pendingGains.techniques?.length > 0
                ? [`+${pendingGains.techniques.length} Technique${pendingGains.techniques.length > 1 ? 's' : ''}`]
                : []),
            ].join(' · ')}
          </div>
        )}
      </div>

      {!locked && isWorld && enemyIds.length > 0 && (
        <div className="enemy-chip-row">
          {enemyIds.map(id => <EnemyChip key={id} enemyId={id} />)}
        </div>
      )}

      {(!locked && (canIdle || isIdling || isLastIdle)) && (
        <div className="region-row-actions">
          {isLastIdle && hasPendingGains && onCollect && (
            <button
              className="region-collect-btn"
              onClick={e => { e.stopPropagation(); AudioManager.playSfx('ui_confirm'); onCollect(); }}
            >
              Collect
            </button>
          )}
          {(canIdle || isIdling) && (
            <button
              className={`region-idle-btn${isIdling ? ' region-idle-btn-active' : ''}`}
              onClick={handleIdleClick}
              title={isIdling ? 'Stop idling here' : 'Idle here automatically'}
            >
              {isIdling ? '◉ Idling' : '◎ Idle'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WorldCard({ world, worldIndex, tab, realmIndex, clearedRegions, onNavigate, expandWorldId, idleAssignment, lastIdleAssignment, onSetIdle,
                     pendingGains, hasPendingGains, onCollect }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');

  const worldLocked = !isWorldUnlocked(worldIndex, realmIndex, clearedRegions);
  const worldHint   = worldLocked ? getWorldLockHint(worldIndex, realmIndex, clearedRegions) : null;

  const [open, setOpen] = useState(
    !worldLocked && (world.id === 1 || world.id === expandWorldId)
  );

  // Re-open when returning from a sub-screen with a specific expandWorldId
  useEffect(() => {
    if (!worldLocked && expandWorldId === world.id) setOpen(true);
  }, [expandWorldId, world.id, worldLocked]);

  const worldName = tGame(`worlds.${world.id}.name`, { defaultValue: world.name });

  // When the world card opens, preload attack + hit sheets for every enemy in
  // this world. Idle is already fetched by the EnemyChip <img> on render.
  useEffect(() => {
    if (!open || worldLocked) return;
    const sprites = new Set();
    world.regions.forEach(region =>
      (region.enemyPool ?? []).forEach(e => {
        const sprite = ENEMIES[e.enemyId]?.sprite;
        if (sprite) sprites.add(sprite);
      })
    );
    sprites.forEach(sprite => preloadEnemySprites(sprite, ['attack', 'hit']));
  }, [open, worldLocked, world.regions]);

  return (
    <div className={`world-card${worldLocked ? ' world-locked' : ''}`}>
      <button
        className="world-header"
        onClick={() => { if (worldLocked) return; AudioManager.playSfx('ui_click'); setOpen(o => !o); }}
        disabled={worldLocked}
      >
        <div className="world-header-left">
          <span className="world-number">{t('worlds.worldCard', { n: world.id })}</span>
          <span className="world-name">{worldName}</span>
        </div>
        <div className="world-header-right">
          {hasPendingGains && lastIdleAssignment?.worldIndex === worldIndex && (
            <span className="world-header-badge" />
          )}
          <span className="world-realms-tag">{world.realms}</span>
          {worldLocked
            ? <span className="world-lock-icon">&#x1F512;</span>
            : <span className={`world-chevron${open ? ' open' : ''}`}>&#9660;</span>
          }
        </div>
      </button>

      {worldLocked && (
        <LockTooltip desc={world.description} hint={worldHint} position="below" />
      )}

      {open && !worldLocked && (
        <div className="region-list">
          {world.regions.map((region, regionIndex) => {
            const realmLocked    = realmIndex < region.minRealmIndex;
            const activityLocked = !realmLocked && tab !== 'world'
              && !clearedRegions.has(region.name);
            const isLocked   = realmLocked || activityLocked;
            const lockHint   = activityLocked ? 'Clear this region in combat first' : undefined;
            const activity   = TAB_ACTIVITY[tab];
            const canIdle    = !realmLocked && clearedRegions.has(region.name) && tab !== 'world';
            const isIdling   = idleAssignment?.activity === activity
                            && idleAssignment?.worldIndex === worldIndex
                            && idleAssignment?.regionIndex === regionIndex;
            const isLastIdle = lastIdleAssignment?.activity === activity
                            && lastIdleAssignment?.worldIndex === worldIndex
                            && lastIdleAssignment?.regionIndex === regionIndex;
            return (
              <RegionRow
                key={region.name}
                region={region}
                tab={tab}
                locked={isLocked}
                lockHint={lockHint}
                combatLocked={activityLocked}
                onNavigate={onNavigate}
                worldId={world.id}
                canIdle={canIdle}
                isIdling={isIdling}
                isLastIdle={isLastIdle}
                onSetIdle={() => onSetIdle(activity, worldIndex, regionIndex)}
                onClearIdle={() => onSetIdle(null)}
                pendingGains={pendingGains}
                hasPendingGains={hasPendingGains}
                onCollect={onCollect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorldsScreen({ cultivation, onNavigate, expandWorldId, activeTab, clearedRegions, idleAssignment, lastIdleAssignment, onSetIdle,
                        pendingGains, hasPendingGains, onCollectGains, inventory, techniques }) {
  const { t } = useTranslation('ui');
  const [tab, setTab] = useState(activeTab ?? 'world');
  const realmIndex = cultivation.realmIndex;
  const cleared    = clearedRegions ?? new Set();

  function handleCollect() {
    onCollectGains?.(gains => {
      Object.entries(gains.items ?? {}).forEach(([id, qty]) => inventory?.addItem(id, qty));
      gains.techniques?.forEach(tech => techniques?.addOwnedTechnique(tech));
    });
  }

  return (
    <div className="screen worlds-screen">
      <h1>{t('worlds.title')}</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      <div className="worlds-tab-bar">
        <button
          className={`worlds-tab-btn worlds-tab-combat${tab === 'world' ? ' active' : ''}`}
          onClick={() => setTab('world')}
        >
          ⚔ {t('worlds.tabWorld')}
        </button>
        <div className="worlds-tab-resource-row">
          <button
            className={`worlds-tab-btn worlds-tab-resource${tab === 'gather' ? ' active' : ''}`}
            onClick={() => setTab('gather')}
          >
            🌿 {t('worlds.tabGather')}
            {hasPendingGains && lastIdleAssignment?.activity === 'gathering' && (
              <span className="worlds-tab-badge" />
            )}
          </button>
          <button
            className={`worlds-tab-btn worlds-tab-resource${tab === 'mine' ? ' active' : ''}`}
            onClick={() => setTab('mine')}
          >
            ⛏ {t('worlds.tabMine')}
            {hasPendingGains && lastIdleAssignment?.activity === 'mining' && (
              <span className="worlds-tab-badge" />
            )}
          </button>
        </div>
      </div>

      <div className="worlds-list">
        {WORLDS.map((world, worldIndex) => (
          <WorldCard
            key={world.id}
            world={world}
            worldIndex={worldIndex}
            tab={tab}
            realmIndex={realmIndex}
            clearedRegions={cleared}
            onNavigate={onNavigate}
            expandWorldId={expandWorldId}
            idleAssignment={idleAssignment}
            lastIdleAssignment={lastIdleAssignment}
            onSetIdle={onSetIdle ?? (() => {})}
            pendingGains={pendingGains}
            hasPendingGains={hasPendingGains}
            onCollect={handleCollect}
          />
        ))}
      </div>
    </div>
  );
}

export default WorldsScreen;
