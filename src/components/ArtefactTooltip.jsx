import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QUALITY, getSlotBonuses } from '../data/artefacts';
import { AFFIX_UNIQUE_COLOR, formatAffixValue } from '../data/affixDisplay';

/**
 * Shared artefact tooltip — renders the item name, quality badge, derived
 * slot bonuses and any rolled affixes. Used by the Equip-tab picker, the
 * Collection tab, and the Transmutation panel so hover previews stay in
 * sync across screens.
 */
export default function ArtefactTooltip({ artefact, affixes, style }) {
  const { t } = useTranslation('ui');
  if (!artefact) return null;
  const quality = QUALITY[artefact.rarity];
  const baseBonuses = getSlotBonuses(artefact.slot, artefact.rarity);
  const artName = artefact.name;

  return (
    <div className="art-tooltip" style={style}>
      <span className="art-tooltip-name" style={{ color: quality?.color }}>{artName}</span>
      <span className="art-tooltip-quality" style={{ color: quality?.color }}>
        {t(`quality.${artefact.rarity}`, { defaultValue: quality?.label })}
      </span>
      {baseBonuses.length > 0 && (
        <div className="art-tooltip-section">
          {baseBonuses.map((b, i) => (
            <span key={i} className="art-tooltip-line">{formatAffixValue(b)}</span>
          ))}
        </div>
      )}
      {affixes && affixes.length > 0 && (
        <div className="art-tooltip-section art-tooltip-affixes">
          {affixes.map((a, i) => (
            <span
              key={i}
              className={`art-tooltip-line art-tooltip-affix${a.unique ? ' art-tooltip-affix-unique' : ''}`}
              style={a.unique ? { color: AFFIX_UNIQUE_COLOR } : undefined}
            >
              {a.unique && '★ '}{formatAffixValue(a)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tooltip-position hook — returns mouse/touch handlers and the live {x,y}
 * so screens can position <ArtefactTooltip> near the cursor without a
 * layout pass.
 */
export function useTooltipPos() {
  const [pos, setPos] = useState(null);
  const touchTimer = useRef(null);

  const onMouseEnter = useCallback((e) => {
    setPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }, []);

  const onMouseMove = useCallback((e) => {
    setPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }, []);

  const onMouseLeave = useCallback(() => {
    setPos(null);
  }, []);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchTimer.current = setTimeout(() => {
      setPos({ x: touch.clientX, y: touch.clientY - 80 });
    }, 500);
  }, []);

  const onTouchEnd = useCallback(() => {
    clearTimeout(touchTimer.current);
    setPos(null);
  }, []);

  const onTouchMove = useCallback(() => {
    clearTimeout(touchTimer.current);
    setPos(null);
  }, []);

  return {
    pos,
    handlers: { onMouseEnter, onMouseMove, onMouseLeave, onTouchStart, onTouchEnd, onTouchMove },
  };
}
