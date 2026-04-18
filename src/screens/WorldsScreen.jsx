import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import WORLDS from '../data/worlds';
import ENEMIES from '../data/enemies';
import { preloadEnemySprites } from '../utils/preload';
import { isWorldUnlocked, getWorldLockHint } from '../data/featureGates';
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

function RegionRow({ region, tab, locked, lockHint, onNavigate, worldId,
                     canIdle, isIdling, onSetIdle, onClearIdle }) {
  const { t } = useTranslation('ui');
  const { t: tGame }  = useTranslation('game');

  const isWorld = tab === 'world';

  // Deduplicate enemy IDs (a pool may have the same enemy at different weights).
  const enemyIds = isWorld
    ? [...new Set((region.enemyPool ?? []).map(e => e.enemyId))]
    : [];

  // Combat drops are per-enemy (enemies.js). Aggregate the unique item IDs
  // that can drop across all enemies in this region's pool.
  const combatDropNames = isWorld
    ? (() => {
        const seen = new Set();
        const names = [];
        for (const id of enemyIds) {
          const def = ENEMIES[id];
          for (const d of (def?.drops ?? [])) {
            if (seen.has(d.itemId)) continue;
            seen.add(d.itemId);
            const mat = ALL_MATERIALS[d.itemId];
            const name = mat
              ? tGame(`items.${d.itemId}.name`, { defaultValue: mat.name })
              : d.itemId;
            names.push(name);
          }
        }
        return names;
      })()
    : [];

  const content = isWorld
    ? { secondary: combatDropNames.length
          ? `${t('worlds.drops')} ${combatDropNames.join(', ')}`
          : null }
    : tab === 'gather'
    ? { primary: region.herbs }
    : { primary: region.ores };

  const regionName    = locked ? '???' : tGame(`regions.${region.name}.name`, { defaultValue: region.name });
  const minRealmLabel = tGame(`stages.${region.minRealm}.name`, { defaultValue: region.minRealm });

  const SCREEN_MAP = { world: 'combat-arena', gather: 'gathering', mine: 'mining' };

  function handleClick() {
    if (isWorld) {
      const sprites = [...new Set(
        (region.enemyPool ?? []).map(e => ENEMIES[e.enemyId]?.sprite).filter(Boolean)
      )];
      sprites.forEach(sprite => preloadEnemySprites(sprite));
    }
    onNavigate(SCREEN_MAP[tab], { region, worldId, fromTab: tab });
  }

  function handleIdleClick(e) {
    e.stopPropagation();
    if (isIdling) onClearIdle();
    else onSetIdle();
  }

  return (
    <div
      className={`region-row${locked ? ' region-locked' : ''}${isWorld && !locked ? ' region-row-world' : ''}${isIdling ? ' region-row-idling' : ''}`}
      onClick={!locked ? handleClick : undefined}
      role={!locked ? 'button' : undefined}
      title={locked && lockHint ? lockHint : undefined}
    >
      <div className="region-row-left">
        <div className="region-row-info">
          <span className="region-name">{regionName}</span>
          <span className="region-min-realm">{minRealmLabel}</span>
        </div>
        {!locked && !isWorld && content.primary && (
          <div className="region-row-detail">
            <span className="region-detail-primary">{content.primary}</span>
          </div>
        )}
        {!locked && isWorld && content.secondary && (
          <div className="region-row-detail">
            <span className="region-detail-secondary">{content.secondary}</span>
          </div>
        )}
      </div>

      {!locked && isWorld && enemyIds.length > 0 && (
        <div className="enemy-chip-row">
          {enemyIds.map(id => <EnemyChip key={id} enemyId={id} />)}
        </div>
      )}

      {(canIdle || isIdling) && !locked && (
        <button
          className={`region-idle-btn${isIdling ? ' region-idle-btn-active' : ''}`}
          onClick={handleIdleClick}
          title={isIdling ? 'Stop idling here' : 'Idle here automatically'}
        >
          {isIdling ? '◉ Idling' : '◎ Idle'}
        </button>
      )}
    </div>
  );
}

function WorldCard({ world, worldIndex, tab, realmIndex, clearedRegions, onNavigate, expandWorldId, idleAssignment, onSetIdle }) {
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
    <div
      className={`world-card${worldLocked ? ' world-locked' : ''}`}
      title={worldHint ?? undefined}
    >
      <button
        className="world-header"
        onClick={() => !worldLocked && setOpen(o => !o)}
        disabled={worldLocked}
      >
        <div className="world-header-left">
          <span className="world-number">{t('worlds.worldCard', { n: world.id })}</span>
          <span className="world-name">{worldName}</span>
        </div>
        <div className="world-header-right">
          <span className="world-realms-tag">{world.realms}</span>
          {worldLocked
            ? <span className="world-lock-icon">&#x1F512;</span>
            : <span className={`world-chevron${open ? ' open' : ''}`}>&#9660;</span>
          }
        </div>
      </button>

      {open && !worldLocked && (
        <div className="region-list">
          {world.regions.map((region, regionIndex) => {
            const realmLocked    = realmIndex < region.minRealmIndex;
            const activityLocked = !realmLocked && tab !== 'world'
              && !clearedRegions.has(region.name);
            const isLocked   = realmLocked || activityLocked;
            const lockHint   = activityLocked ? 'Clear this region in combat first' : undefined;
            const activity   = TAB_ACTIVITY[tab];
            const canIdle    = !realmLocked && clearedRegions.has(region.name);
            const isIdling   = idleAssignment?.activity === activity
                            && idleAssignment?.worldIndex === worldIndex
                            && idleAssignment?.regionIndex === regionIndex;
            return (
              <RegionRow
                key={region.name}
                region={region}
                tab={tab}
                locked={isLocked}
                lockHint={lockHint}
                onNavigate={onNavigate}
                worldId={world.id}
                canIdle={canIdle}
                isIdling={isIdling}
                onSetIdle={() => onSetIdle(activity, worldIndex, regionIndex)}
                onClearIdle={() => onSetIdle(null)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorldsScreen({ cultivation, onNavigate, expandWorldId, activeTab, clearedRegions, idleAssignment, onSetIdle,
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

  const TABS = [
    { id: 'world',  tKey: 'worlds.tabWorld'  },
    { id: 'gather', tKey: 'worlds.tabGather' },
    { id: 'mine',   tKey: 'worlds.tabMine'   },
  ];

  return (
    <div className="screen worlds-screen">
      <h1>{t('worlds.title')}</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      {hasPendingGains && (
        <LootBanner pendingGains={pendingGains} onCollect={handleCollect} />
      )}

      <div className="worlds-tab-bar">
        {TABS.map(tb => (
          <button
            key={tb.id}
            className={`worlds-tab-btn${tab === tb.id ? ' active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.tKey)}
          </button>
        ))}
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
            onSetIdle={onSetIdle ?? (() => {})}
          />
        ))}
      </div>
    </div>
  );
}

export default WorldsScreen;
