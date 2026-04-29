import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { QUALITY } from '../data/artefacts';
import { AFFIX_UNIQUE_COLOR, formatAffixValue } from '../data/affixDisplay';
import { ARTEFACT_SETS } from '../data/artefactSets';
import { effectiveAffixValue, bonusCount, bonusSum } from '../data/artefactUpgrades';

/**
 * Shared artefact tooltip — renders the item name, quality badge, derived
 * slot bonuses and any rolled affixes. Used by the Equip-tab picker, the
 * Collection tab, and the Transmutation panel so hover previews stay in
 * sync across screens.
 */
export default function ArtefactTooltip({ artefact, affixes, style, element, setIds, upgradeLevel, affixBonuses }) {
  const { t } = useTranslation('ui');
  if (!artefact) return null;
  const quality = QUALITY[artefact.rarity];
  const artName = artefact.name;
  // Prefer prop-level fields so call sites can pass instance data without
  // having to graft it onto the `artefact` object. Fall back to artefact.*
  // for older wirings.
  const elem     = element      ?? artefact.element;
  const sets     = setIds       ?? artefact.setIds;
  const level    = upgradeLevel ?? artefact.upgradeLevel ?? 0;
  const bonuses  = affixBonuses ?? artefact.affixBonuses ?? {};

  // Portal to document.body so ancestors using `transform` / `filter` (the
  // mobile bottom-sheet picker) don't trap a position:fixed tooltip inside
  // their containing block.
  const content = (
    // --quality-color is consumed by .art-tooltip-name and .art-tooltip-quality
    // via CSS — single source of truth for the rarity tint.
    <div className="art-tooltip" style={{ ...style, '--quality-color': quality?.color }}>
      <span className="art-tooltip-name">
        {artName}{level > 0 && <span className="art-tooltip-level">+{level}</span>}
      </span>
      <span className="art-tooltip-quality">
        {t(`quality.${artefact.rarity}`, { defaultValue: quality?.label })}
        {elem && <> · {t(`elements.${elem}`, { defaultValue: elem })}</>}
      </span>
      {Array.isArray(sets) && sets.length > 0 && (
        <div className="art-tooltip-section art-tooltip-sets">
          {sets.map(sid => {
            const s = ARTEFACT_SETS[sid];
            if (!s) return <span key={sid} className="art-tooltip-line">◆ {sid}</span>;
            return (
              <div key={sid}>
                <span className="art-tooltip-line">◆ {s.name}</span>
                <span className="art-tooltip-line art-tooltip-line-sub">
                  2p: {s.twoPiece?.description}
                </span>
                <span className="art-tooltip-line art-tooltip-line-sub">
                  4p: {s.fourPiece?.description}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {affixes && affixes.length > 0 && (
        <div className="art-tooltip-section art-tooltip-affixes">
          {affixes.map((a, i) => {
            const entry    = bonuses[i];
            const sum      = bonusSum(entry);
            const count    = bonusCount(entry);
            const effValue = level > 0 || sum !== 0
              ? effectiveAffixValue(a, level, entry)
              : a.value;
            const display = { ...a, value: effValue };
            return (
              <span
                key={i}
                className={`art-tooltip-line art-tooltip-affix${a.unique ? ' art-tooltip-affix-unique' : ''}`}
              >
                {a.unique && '★ '}{formatAffixValue(display)}
                {count > 0 && <span className="art-tooltip-count">(+{count})</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
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
