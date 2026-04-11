import { useState, useEffect } from 'react';
import { computeAllStats } from '../data/stats';

function fmt(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── SVG Sprites ─────────────────────────────────────────────────────────────

function EssenceSprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <polygon points="22,3 38,12 38,32 22,41 6,32 6,12" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.8" />
      <line x1="22" y1="3"  x2="22" y2="41" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45" />
      <line x1="6"  y1="22" x2="38" y2="22" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.45" />
      <line x1="6"  y1="12" x2="38" y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3" />
      <line x1="38" y1="12" x2="6"  y2="32" stroke="#7dd3fc" strokeWidth="0.6" opacity="0.3" />
      <polygon points="22,13 30,22 22,31 14,22" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1" />
      <circle cx="22" cy="22" r="3.5" fill="#e0f2fe" />
      <circle cx="22" cy="22" r="1.5" fill="#fff" />
    </svg>
  );
}

function SoulSprite({ size = 44, locked = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" opacity={locked ? 0.3 : 1}>
      <circle cx="22" cy="22" r="19" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="3 2.5" fill="#1e1b4b" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="22" cy="10" rx="3.5" ry="6.5"
          fill="#4c1d95" stroke="#a855f7" strokeWidth="0.9"
          transform={`rotate(${deg} 22 22)`}
        />
      ))}
      <circle cx="22" cy="22" r="6.5" fill="#6d28d9" stroke="#ddd6fe" strokeWidth="1.2" />
      <circle cx="22" cy="22" r="2.5" fill="#f5f3ff" />
      <circle cx="20.5" cy="20.5" r="1" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function BodySprite({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <polygon points="22,4 41,41 3,41" fill="#431407" stroke="#f97316" strokeWidth="1.8" />
      <polygon points="22,14 32,33 12,33" fill="#7c2d12" stroke="#fb923c" strokeWidth="0.9" />
      <polygon points="22,4 27.5,17 16.5,17" fill="#fed7aa" opacity="0.85" />
      <line x1="22" y1="4" x2="22" y2="11" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
      <line x1="3" y1="41" x2="41" y2="41" stroke="#f97316" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

// ─── Triangle connector ───────────────────────────────────────────────────────
const STAT_COLORS = { soul: '#a855f7', essence: '#38bdf8', body: '#f97316' };
const TRANSITION  = { transition: 'stroke 0.25s, stroke-width 0.25s' };

function TriangleLines({ activeStat }) {
  const lineProps = (a, b) => {
    const lit = activeStat === a || activeStat === b;
    return {
      stroke: lit ? (STAT_COLORS[activeStat] ?? '#2a2a4a') : '#2a2a4a',
      strokeWidth: lit ? 1.8 : 1.2,
      strokeDasharray: '6 4',
      style: TRANSITION,
    };
  };
  return (
    <svg className="stat-triangle-lines" viewBox="0 0 280 230" preserveAspectRatio="xMidYMid meet">
      <line x1="140" y1="44"  x2="44"  y2="186" {...lineProps('soul', 'essence')} />
      <line x1="140" y1="44"  x2="236" y2="186" {...lineProps('soul', 'body')} />
      <line x1="44"  y1="186" x2="236" y2="186" {...lineProps('essence', 'body')} />
    </svg>
  );
}

// ─── Single stat circle ───────────────────────────────────────────────────────
function StatCircle({ label, value, locked, glowColor, active, onEnter, onLeave, onClick, children }) {
  return (
    <div
      className={`stat-circle${active ? ' stat-circle-active' : ''}${locked ? ' stat-circle-locked' : ''}`}
      style={{ '--glow': glowColor }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {children}
      <span className="stat-circle-name">{label}</span>
      <span className="stat-circle-val" style={{ color: locked ? 'var(--text-muted)' : glowColor }}>
        {locked ? '???' : fmt(value)}
      </span>
    </div>
  );
}

// ─── Detail panel (hover / tap) ───────────────────────────────────────────────
function DetailPanel({ stat, qi, law, realmIndex }) {
  const SAINT_INDEX = 24;
  const locked = stat === 'soul' && realmIndex < SAINT_INDEX;

  const configs = {
    essence: {
      title: 'Essence', subtitle: 'Elemental Power', color: '#38bdf8',
      mult: law.essenceMult, multKey: 'essence_mult',
      effects: ['Drives elemental attacks', 'Contributes to Defense and Elemental Defense'],
    },
    soul: {
      title: 'Soul', subtitle: 'Spiritual Power', color: '#c084fc',
      mult: law.soulMult, multKey: 'soul_mult',
      effects: ['Drives psychic attacks', 'Powers Secret Techniques', 'Feeds Harvest Gathering Speed'],
      lockMsg: 'Unlocks at Saint realm',
    },
    body: {
      title: 'Body', subtitle: 'Physical Power', color: '#f97316',
      mult: law.bodyMult, multKey: 'body_mult',
      effects: ['Drives physical attacks', 'Contributes to Defense', 'Feeds Mining Speed'],
    },
  };

  const cfg = configs[stat];
  const val = Math.floor(qi * cfg.mult);

  return (
    <div className="stat-detail-panel" style={{ '--panel-color': cfg.color }}>
      <div className="sdp-header">
        <span className="sdp-title" style={{ color: cfg.color }}>{cfg.title}</span>
        <span className="sdp-subtitle">{cfg.subtitle}</span>
      </div>
      <div className="sdp-divider" />
      {locked ? (
        <p className="sdp-locked">{cfg.lockMsg}</p>
      ) : (
        <>
          <div className="sdp-formula">
            <code className="sdp-code">Qi × {cfg.multKey}</code>
            <code className="sdp-code sdp-calc">
              {fmt(qi)} × {cfg.mult} = <strong style={{ color: cfg.color }}>{fmt(val)}</strong>
            </code>
            <span className="sdp-source">via {law.name}</span>
          </div>
          <div className="sdp-divider" />
          <ul className="sdp-effects">
            {cfg.effects.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Stat table helpers ───────────────────────────────────────────────────────
function StatGroup({ title, children }) {
  return (
    <div className="secondary-stats">
      <p className="secondary-stats-title">{title}</p>
      {children}
    </div>
  );
}

function StatRow({ label, hint, value, unit = '', locked = false }) {
  return (
    <div className="secondary-stat-row">
      <span className="secondary-stat-label">{label}</span>
      {hint && <span className="secondary-stat-formula">{hint}</span>}
      <span
        className="secondary-stat-value"
        style={locked ? { color: 'var(--text-muted)', fontWeight: 400 } : undefined}
      >
        {locked ? 'Locked' : `${fmt(value)}${unit}`}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function StatsScreen({ cultivation, artefacts }) {
  const { qiRef, activeLaw, realmName, realmIndex } = cultivation;

  const [qi, setQi]             = useState(Math.floor(qiRef.current));
  const [activeStat, setActive] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setQi(Math.floor(qiRef.current)), 250);
    return () => clearInterval(id);
  }, [qiRef]);

  const { meta, primary, combat, activity } = computeAllStats(qi, activeLaw, realmIndex, artefacts?.getStatModifiers());
  const { soulUnlocked } = meta;

  const toggle = (stat) => setActive((s) => (s === stat ? null : stat));
  const enter  = (stat) => setActive(stat);
  const leave  = ()     => setActive(null);

  return (
    <div className="screen stats-screen">
      <h1>Character Stats</h1>
      <p className="subtitle">{realmName}</p>

      {/* ── Primary Stats: triangle left, detail right ── */}
      <div className="stats-primary-row">
        <div className="stat-triangle-container">
          <TriangleLines activeStat={activeStat} />

          <div
            className="stat-circle-wrap stat-wrap-soul"
            onMouseEnter={() => enter('soul')}
            onMouseLeave={leave}
            onClick={() => toggle('soul')}
          >
            <StatCircle label="Soul" value={primary.soul} locked={!soulUnlocked} glowColor="#c084fc" active={activeStat === 'soul'}>
              <SoulSprite size={40} locked={!soulUnlocked} />
            </StatCircle>
          </div>

          <div
            className="stat-circle-wrap stat-wrap-essence"
            onMouseEnter={() => enter('essence')}
            onMouseLeave={leave}
            onClick={() => toggle('essence')}
          >
            <StatCircle label="Essence" value={primary.essence} locked={false} glowColor="#38bdf8" active={activeStat === 'essence'}>
              <EssenceSprite size={40} />
            </StatCircle>
          </div>

          <div
            className="stat-circle-wrap stat-wrap-body"
            onMouseEnter={() => enter('body')}
            onMouseLeave={leave}
            onClick={() => toggle('body')}
          >
            <StatCircle label="Body" value={primary.body} locked={false} glowColor="#f97316" active={activeStat === 'body'}>
              <BodySprite size={40} />
            </StatCircle>
          </div>
        </div>

        <div className="stat-detail-side">
          {activeStat ? (
            <DetailPanel stat={activeStat} qi={qi} law={activeLaw} realmIndex={realmIndex} />
          ) : (
            <div className="sdp-placeholder">
              <span>Tap a stat</span>
              <span>for details</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Combat Stats ── */}
      <StatGroup title="Combat">
        <StatRow label="Health"         hint="(Essence + Body) × 12"  value={combat.health} />
        <StatRow label="Defense"        hint="Essence + Body"          value={combat.defense} />
        <StatRow label="Elem Defense"   hint="from Essence"            value={combat.elemDef} />
        <StatRow label="Soul Toughness" hint="from Soul"               value={combat.soulTough}    locked={!soulUnlocked} />
        <StatRow label="Phys Damage"    hint="bonus"                   value={combat.physDmg} />
        <StatRow label="Elem Damage"    hint="bonus"                   value={combat.elemDmg} />
        <StatRow label="Psych Damage"   hint="bonus"                   value={combat.psychDmg}     locked={!soulUnlocked} />
        <StatRow label="Exploit Chance" hint=""                        value={combat.exploitChance} unit="%" />
        <StatRow label="Exploit Mult"   hint=""                        value={combat.exploitMult}   unit="%" />
      </StatGroup>

      {/* ── Activity Stats ── */}
      <StatGroup title="Activity">
        <StatRow label="Qi Speed"       hint="base × law mult"         value={activity.qiSpeed}      unit="/s" />
        <StatRow label="Focus Mult"     hint="while boosting"          value={activity.focusMult}    unit="%" />
        <StatRow label="Harvest Speed"  hint="from Soul"               value={activity.harvestSpeed} locked={!soulUnlocked} />
        <StatRow label="Harvest Luck"   hint=""                        value={activity.harvestLuck} />
        <StatRow label="Mining Speed"   hint="from Body"               value={activity.miningSpeed} />
        <StatRow label="Mining Luck"    hint=""                        value={activity.miningLuck} />
      </StatGroup>
    </div>
  );
}

export default StatsScreen;
