import { useState, useEffect, useRef } from 'react';
import { ORES, RARITY_COLOR } from '../data/materials';

const BASE_MINE_SPEED = 3; // mine points per second

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(s => s && !s.includes('TBD'));
}

/** Convert display name like "Black Tortoise Iron" → "black_tortoise_iron". */
function nameToId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function pickItem(list, lookup) {
  const name = list[Math.floor(Math.random() * list.length)];
  const data = lookup[name] ?? { rarity: 'Common', mineCost: 30 };
  return { name, ...data };
}

function MiningScreen({ region, inventory, onBack }) {
  const oreList = parseList(region.ores);

  const [current, setCurrent]    = useState(() => pickItem(oreList, ORES));
  const [collected, setCollected] = useState([]);

  const progressBarRef = useRef(null);
  const progressVal    = useRef(0);
  const currentRef     = useRef(current);
  const lastTRef       = useRef(null);

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

      progressVal.current += BASE_MINE_SPEED * dt;
      const cost = currentRef.current.mineCost;
      const pct  = Math.min(progressVal.current / cost, 1);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct * 100}%`;
      }

      if (progressVal.current >= cost) {
        const mined = { ...currentRef.current };
        progressVal.current = 0;

        // Add to inventory using snake_case id
        if (inventory) {
          inventory.addItem(nameToId(mined.name), 1);
        }

        const next = pickItem(oreList, ORES);
        currentRef.current = next;
        setCurrent(next);

        setCollected(prev => {
          const idx = prev.findIndex(c => c.name === mined.name);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], count: updated[idx].count + 1 };
            return updated;
          }
          return [{ name: mined.name, rarity: mined.rarity, count: 1 }, ...prev];
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
          <span className="harvest-activity">Mining</span>
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
          Cost: {current.mineCost} &nbsp;·&nbsp; Speed: {BASE_MINE_SPEED}/s
        </div>
        <div className="harvest-bar-track">
          <div ref={progressBarRef} className="harvest-bar-fill mine-fill" />
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

export default MiningScreen;
