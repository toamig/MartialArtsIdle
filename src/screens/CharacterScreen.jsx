// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BuildContent from './BuildTab';
import StatsContent from './StatsTab';

const TABS = [
  { id: 'equip', tKey: 'character.tabEquip', defaultLabel: 'Equip' },
  { id: 'stats', tKey: 'character.tabStats', defaultLabel: 'Stats' },
];

function CharacterScreen({ cultivation, techniques, artefacts, pills, tree }) {
  const { t }        = useTranslation('ui');
  const { t: tGame } = useTranslation('game');
  const [tab, setTab] = useState('equip');

  const { activeLaw, realmName } = cultivation;

  // Subtitle summary — mirrors the Collection page's "X artefacts · Y techniques · Z laws" pattern
  const activeLawName = activeLaw
    ? tGame(`laws.${activeLaw.id}.name`, { defaultValue: activeLaw.name })
    : null;
  const equippedGearCount = Object.values(artefacts?.equipped ?? {}).filter(Boolean).length;
  const equippedTechCount = (techniques?.equippedTechniques ?? []).filter(Boolean).length;

  return (
    <div className="screen character-screen">
      <header className="coll-page-header">
        <h1>{t('character.title', { defaultValue: 'Character' })}</h1>
        <span className="coll-page-subtitle">
          {realmName}
          {` · ${activeLawName ?? t('build.lawUnequipped', { defaultValue: 'No law' })}`}
          {` · ${equippedGearCount}/9 gear`}
          {equippedTechCount > 0 ? ` · ${equippedTechCount} techniques` : ''}
        </span>
      </header>

      {/* Unified tab bar — matches inv-tabs / inv-tab / inv-tab-active from CollectionScreen */}
      <div className="inv-tabs">
        {TABS.map(tb => (
          <button
            key={tb.id}
            className={`inv-tab${tab === tb.id ? ' inv-tab-active' : ''}`}
            onClick={() => setTab(tb.id)}
          >
            {t(tb.tKey, { defaultValue: tb.defaultLabel })}
          </button>
        ))}
      </div>

      <div className="char-tab-content">
        {tab === 'equip' && (
          <BuildContent
            cultivation={cultivation}
            techniques={techniques}
            artefacts={artefacts}
          />
        )}
        {tab === 'stats' && (
          <StatsContent
            cultivation={cultivation}
            artefacts={artefacts}
            pills={pills}
            tree={tree}
          />
        )}
      </div>
    </div>
  );
}

export default CharacterScreen;
