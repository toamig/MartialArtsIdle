// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BuildContent from './BuildTab';
import StatsContent from './StatsTab';

const TABS = [
  { id: 'equip', tKey: 'character.tabEquip',  defaultLabel: 'Equip'  },
  { id: 'stats', tKey: 'character.tabStats',  defaultLabel: 'Stats'  },
];

function CharacterScreen({ cultivation, techniques, artefacts, pills, tree }) {
  const { t } = useTranslation('ui');
  const [tab, setTab] = useState('equip');

  return (
    <div className="screen character-screen">
      <h1>{t('character.title', { defaultValue: 'Character' })}</h1>
      <p className="subtitle">{cultivation.realmName}</p>

      <div className="char-tab-bar">
        {TABS.map(tb => (
          <button
            key={tb.id}
            className={`char-tab-btn${tab === tb.id ? ' active' : ''}`}
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
