import { useState } from 'react';
import WORLDS from '../data/worlds';

const TABS = [
  { id: 'world',   label: 'World'  },
  { id: 'gather',  label: 'Gather' },
  { id: 'mine',    label: 'Mine'   },
];

function RegionRow({ region, tab, locked }) {
  const content = tab === 'world'
    ? { primary: region.enemies, secondary: `Drops: ${region.drops}` }
    : tab === 'gather'
    ? { primary: region.herbs }
    : { primary: region.ores };

  return (
    <div className={`region-row${locked ? ' region-locked' : ''}`}>
      <div className="region-row-top">
        <div className="region-row-info">
          <span className="region-name">{locked ? '???' : region.name}</span>
          <span className="region-min-realm">{region.minRealm}</span>
        </div>
        <button className="region-assign-btn" disabled={locked}>
          {locked ? 'Locked' : 'Assign'}
        </button>
      </div>
      {!locked && (
        <div className="region-row-detail">
          <span className="region-detail-primary">{content.primary}</span>
          {content.secondary && (
            <span className="region-detail-secondary">{content.secondary}</span>
          )}
        </div>
      )}
    </div>
  );
}

function WorldCard({ world, tab, realmIndex }) {
  const worldLocked = realmIndex < world.minRealmIndex;
  const [open, setOpen] = useState(!worldLocked && world.id === 1);

  return (
    <div className={`world-card${worldLocked ? ' world-locked' : ''}`}>
      <button
        className="world-header"
        onClick={() => !worldLocked && setOpen(o => !o)}
        disabled={worldLocked}
      >
        <div className="world-header-left">
          <span className="world-number">World {world.id}</span>
          <span className="world-name">{world.name}</span>
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
          {world.regions.map(region => (
            <RegionRow
              key={region.name}
              region={region}
              tab={tab}
              locked={realmIndex < region.minRealmIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorldsScreen({ cultivation }) {
  const [tab, setTab] = useState('world');
  const realmIndex = cultivation.realmIndex;

  return (
    <div className="screen worlds-screen">
      <h1>Worlds</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      <div className="worlds-tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`worlds-tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="worlds-list">
        {WORLDS.map(world => (
          <WorldCard
            key={world.id}
            world={world}
            tab={tab}
            realmIndex={realmIndex}
          />
        ))}
      </div>
    </div>
  );
}

export default WorldsScreen;
