// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BuildContent from './BuildTab';
import StatsContent from './StatsTab';
import { SELECTION_BY_ID, SELECTION_RARITY } from '../data/selections';

function PerksTab({ selections }) {
  const { t } = useTranslation('ui');
  const active = selections?.active ?? {};
  const entries = Object.entries(active).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return (
      <div className="char-perks-empty">
        <p className="char-perks-title">{t('character.perksEmptyTitle', { defaultValue: 'No Perks Yet' })}</p>
        <p className="char-perks-desc">{t('character.perksEmptyDesc', { defaultValue: "Perks are rewards earned at each realm level-up and breakthrough. They will appear here once you've earned some." })}</p>
      </div>
    );
  }

  return (
    <div className="char-perks-list">
      {entries.map(([optId, stacks]) => {
        const opt = SELECTION_BY_ID[optId];
        if (!opt) return null;
        const rarity = SELECTION_RARITY[opt.rarity];
        return (
          <div key={optId} className="char-perk-row" style={{ borderLeft: `3px solid ${rarity.color}` }}>
            <div className="char-perk-info">
              <span className="char-perk-name" style={{ color: rarity.color }}>{opt.name}</span>
              <span className="char-perk-desc">{opt.description}</span>
            </div>
            {stacks > 1 && (
              <span className="char-perk-stacks">×{stacks}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { id: 'equip', tKey: 'character.tabEquip',  defaultLabel: 'Equip'  },
  { id: 'stats', tKey: 'character.tabStats',  defaultLabel: 'Stats'  },
  { id: 'perks', tKey: 'character.tabPerks',  defaultLabel: 'Perks'  },
];

function CharacterScreen({ cultivation, techniques, artefacts, selections, pills, tree }) {
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
            selections={selections}
            tree={tree}
          />
        )}
        {tab === 'perks' && <PerksTab selections={selections} />}
      </div>
    </div>
  );
}

export default CharacterScreen;
