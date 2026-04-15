import { useState, useEffect, useRef } from 'react';
import { HERBS, RARITY_COLOR, ALL_MATERIALS } from '../data/materials';

const BASE_GATHER_SPEED = 3; // gather points per second

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(s => s && !s.includes('TBD'));
}

/** Resolve display name to snake_case inventory ID via ALL_MATERIALS reverse lookup. */
function nameToId(name) {
  const entry = Object.entries(ALL_MATERIALS).find(([, m]) => m.name === name);
  return entry ? entry[0] : name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function pickItem(list, lookup) {
  const name = list[Math.floor(Math.random() * list.length)];
  const data = lookup[name] ?? { rarity: 'Common', gatherCost: 30 };
  return { name, ...data };
}

function GatheringScreen({ region, inventory, onBack, getFullStats }) {
  const herbList = parseList(region.herbs);

  const [current, setCurrent]   = useState(() => pickItem(herbList, HERBS));
  const [collected, setCollected] = useState([]);

  const progressBarRef = useRef(null);
  const progressVal    = useRef(0);
  const currentRef     = useRef(current);
  const lastTRef       = useRef(null);

  // Keep currentRef in sync when state changes (e.g. next herb picked)
  useEffect(() => { currentRef.current = current; }, [current]);

  useEffect(() => {
    progressVal.current = 0;
    lastTRef.current = null;
    let raf;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      if (!lastTRef.current) { lastTRef.current = now; return; }
      const dt = Math.min((now - lastTRef.current) / 1000, 0.1);
      lastTRef.current = now;

      // Apply harvest_speed (additive to BASE_GATHER_SPEED) per tick.
      const stats = getFullStats?.();
      const speed = BASE_GATHER_SPEED + Math.max(0, stats?.harvestSpeed ?? 0);
      progressVal.current += speed * dt;
      const cost = currentRef.current.gatherCost;
      const pct  = Math.min(progressVal.current / cost, 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct * 100}%`;
      }

      if (progressVal.current >= cost) {
        const gathered = { ...currentRef.current };
        progressVal.current = 0;

        // Apply harvest_luck: % chance per gather to receive a bonus duplicate.
        const luckPct = Math.min(100, Math.max(0, stats?.harvestLuck ?? 0));
        const qty     = 1 + (luckPct > 0 && Math.random() * 100 < luckPct ? 1 : 0);

        // Add to inventory using snake_case id
        if (inventory) {
          inventory.addItem(nameToId(gathered.name), qty);
        }

        // Pick next herb (may be same one again — that's fine)
        const next = pickItem(herbList, HERBS);
        currentRef.current = next;
        setCurrent(next);

        setCollected(prev => {
          const idx = prev.findIndex(c => c.name === gathered.name);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], count: updated[idx].count + 1 };
            return updated;
          }
          return [{ name: gathered.name, rarity: gathered.rarity, count: 1 }, ...prev];
        });
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const color = RARITY_COLOR[current.rarity] ?? '#aaa';

  return (
    <div className="screen harvest-screen">
      <div className="harvest-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="harvest-location">
          <span className="harvest-activity">Gathering</span>
          <span className="harvest-region">{region.name}</span>
        </div>
      </div>

      <div className="harvest-card">
        <div className="harvest-item-row">
          <span className="harvest-item-name" style={{ color }}>{current.name}</span>
          <span className="harvest-item-rarity" style={{ color, borderColor: color }}>
            {current.rarity}
          </span>
        </div>
        <div className="harvest-cost-label">
          Cost: {current.gatherCost} &nbsp;·&nbsp; Speed: {BASE_GATHER_SPEED + Math.max(0, getFullStats?.()?.harvestSpeed ?? 0)}/s
          {(getFullStats?.()?.harvestLuck ?? 0) > 0 && (
            <> &nbsp;·&nbsp; Luck: {getFullStats?.()?.harvestLuck}%</>
          )}
        </div>
        <div className="harvest-bar-track">
          <div ref={progressBarRef} className="harvest-bar-fill gather-fill" />
        </div>
      </div>

      {collected.length > 0 && (
        <div className="harvest-loot">
          <p className="harvest-loot-title">Collected this session</p>
          {collected.map(item => (
            <div key={item.name} className="harvest-loot-row">
              <span
                className="harvest-loot-name"
                style={{ color: RARITY_COLOR[item.rarity] ?? '#aaa' }}
              >
                {item.name}
              </span>
              <span className="harvest-loot-count">×{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GatheringScreen;
