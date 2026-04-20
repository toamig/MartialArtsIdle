import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NODES, BRANCHES, MAIN_KEYSTONES, TREE_TOTAL_COST, SAINT_UNLOCK_INDEX } from '../data/reincarnationTree';

// ── World-space layout ────────────────────────────────────────────────────────
// Five branches radiate from (0,0). Yin Yang hangs straight down (sealed).
// Angles in standard math convention; y is negated for screen coords.
const BRANCH_ANGLE_DEG = {
  legacy:  135,
  martial:  45,
  fate:    320,
  will:    220,
  yinyang: 270,
};


function degToRad(d) { return d * Math.PI / 180; }

function radialXY(angleDeg, r) {
  const a = degToRad(angleDeg);
  return { x: Math.round(r * Math.cos(a)), y: Math.round(-r * Math.sin(a)) };
}

// Hand-placed positions [angleDeg, radius] — each branch confined to its sector
// so sequential edges never cross adjacent-branch edges.
//   Martial  18°– 85°   Will  183°–244°   Yin Yang 250°–290°
//   Legacy   93°–172°   Fate  298°–358°
const NODE_POS = {
  md_1: [52,  215], md_2: [36,  408], md_3: [61,  572], md_4: [41,  748], md_k: [51,  930],
  al_1: [126, 218], al_2: [149, 402], al_3: [121, 570], al_4: [136, 742], al_k: [128, 924],
  hw_1: [229, 216], hw_2: [209, 406], hw_3: [236, 568], hw_4: [212, 744], hw_k: [227, 926],
  fp_1: [311, 220], fp_2: [331, 396], fp_3: [307, 566], fp_4: [301, 650], fp_k: [313, 918],
  yy_1: [261, 220], yy_2: [279, 394], yy_3: [257, 564], yy_4: [281, 734], yy_k: [273, 900],
  cb_is: [178, 648], cb_ts: [2,   754], cb_pt: [270, 1120],
};

// Compute world position for every node
const WORLD = { root: { x: 0, y: 0 } };
for (const node of NODES) {
  const [a, r] = NODE_POS[node.id];
  WORLD[node.id] = radialXY(a, r);
}

// Build edge list: [sourceId, targetId]
const EDGES = [];
// Root → first node of each branch (cross-branch connects via prereqs, not root)
for (const node of NODES) {
  if (node.step === 0 && node.branch !== 'cross') {
    EDGES.push(['root', node.id]);
  }
  // Within-branch and cross-branch edges from prereqs
  for (const prereqId of node.prereqs) {
    EDGES.push([prereqId, node.id]);
  }
}

// ── Branch label positions (halfway along branch, perpendicular offset) ──────
function branchLabelPos(branch) {
  const angleDeg = BRANCH_ANGLE_DEG[branch];
  const r        = 305; // midpoint between step-0 (~215) and step-1 (~400) radii
  const pos      = radialXY(angleDeg, r);
  // Perpendicular offset so label doesn't sit on the line
  const perpDeg  = angleDeg + 90;
  const perp     = radialXY(perpDeg, 30);
  return { x: pos.x + perp.x, y: pos.y + perp.y - 20 };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EternalTreeScreen({
  karma, tree, lives,
  highestReached, peakKarmaTotal,
  realmIndex,
  onReincarnate, onClose,
}) {
  const canvasRef  = useRef(null);
  const dragRef    = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const scaleRef   = useRef(1);
  const [pan,         setPan]         = useState({ x: 0, y: 0 });
  const [scale,       setScale]       = useState(1);
  const [isDragging,  setIsDragging]  = useState(false);
  const [activeNode,  setActiveNode]  = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [infoOpen,    setInfoOpen]    = useState(false);

  // Centre the root on mount
  useEffect(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    setPan({ x: Math.round(width / 2), y: Math.round(height * 0.28) });
  }, []);

  // Scroll-to-zoom — wheel event must be non-passive to call preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.9;
      const rect   = canvas.getBoundingClientRect();
      const cx     = e.clientX - rect.left;
      const cy     = e.clientY - rect.top;
      const prev   = scaleRef.current;
      const next   = Math.max(0.25, Math.min(3, prev * factor));
      scaleRef.current = next;
      setScale(next);
      setPan(p => ({
        x: cx - (cx - p.x) * (next / prev),
        y: cy - (cy - p.y) * (next / prev),
      }));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // Panning
  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.et-node')) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current.active = false;
    setIsDragging(false);
  }, []);

  const canReincarnateNow = realmIndex >= SAINT_UNLOCK_INDEX;

  const doReincarnate = () => {
    setShowConfirm(false);
    onReincarnate();
    onClose();
  };

  const handleNodeClick = (node) => {
    if (tree.canBuy(node.id)) { tree.buy(node.id); return; }
    setActiveNode(prev => prev?.id === node.id ? null : node);
  };

  // Derived display state
  const purchasedSet = tree.purchased;
  const keystoneCount = MAIN_KEYSTONES.filter(k => purchasedSet.has(k)).length;
  const yyUnlocked    = keystoneCount >= 2;

  // Edge colours: use branch colour of the target node
  const edgeStateOf = useCallback((sourceId, targetId) => {
    const srcOwned = sourceId === 'root' || purchasedSet.has(sourceId);
    const tgtOwned = purchasedSet.has(targetId);
    if (srcOwned && tgtOwned) return 'active';
    if (srcOwned)             return 'lit';
    return 'dim';
  }, [purchasedSet]);

  const nodeStateOf = useCallback((node) => {
    if (purchasedSet.has(node.id)) return 'purchased';
    // Yin Yang branch is fully sealed until yyUnlocked
    if (node.branch === 'yinyang' && !yyUnlocked) return 'sealed';
    if (tree.isAvailable(node.id)) return tree.canBuy(node.id) ? 'affordable' : 'locked-cost';
    return 'locked-prereq';
  }, [purchasedSet, yyUnlocked, tree]);

  const branchColorOf = (branchId) => BRANCHES[branchId]?.colorRgb ?? '148,163,184';

  return (
    <div className="et-screen">

      {/* ── Floating card — top-left ── */}
      <div className="et-card">
        <div className="et-card-header">
          <span className="et-card-icon">☸</span>
          <span className="et-card-title">Eternal Tree</span>
          <button className="et-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="et-card-stats">
          <span className="et-card-karma"><span className="et-hud-karma-gem">◈</span>{karma}</span>
          <span className="et-card-lives">{lives} {lives === 1 ? 'life' : 'lives'}</span>
        </div>
        <div className="et-card-actions">
          <button
            className="et-info-btn"
            onMouseEnter={() => setInfoOpen(true)}
            onMouseLeave={() => setInfoOpen(false)}
            onTouchStart={() => setInfoOpen(v => !v)}
            aria-label="Info"
          >ℹ</button>
          {canReincarnateNow && (
            <button className="et-reinc-btn" onClick={() => setShowConfirm(true)}>☸ Reincarnate</button>
          )}
        </div>
      </div>

      {/* ── Info panel — absolute overlay ── */}
      {infoOpen && (
        <div className="et-info-panel">
          <div className="et-info-cols">
            <div className="et-info-col et-info-col-lost">
              <div className="et-info-col-title">Lost on Rebirth</div>
              <ul><li>QI &amp; realm progress</li><li>Inventory &amp; materials</li><li>Artefacts &amp; techniques</li><li>Pills &amp; discoveries</li></ul>
            </div>
            <div className="et-info-col et-info-col-kept">
              <div className="et-info-col-title">Survives Rebirth</div>
              <ul><li>Karma &amp; this tree</li><li>Active Law (if Ancient Roots owned)</li><li>Lives counter</li></ul>
            </div>
            <div className="et-info-col">
              <div className="et-info-col-title">Progress</div>
              <ul><li>Peak: {highestReached} / 50</li><li>Full peak: {peakKarmaTotal} ◈</li><li>Full tree: {TREE_TOTAL_COST} ◈</li></ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Pan canvas ── */}
      <div
        ref={canvasRef}
        className={`et-canvas${isDragging ? ' et-canvas-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="et-hint">Drag to pan · Scroll to zoom · Tap a glowing node to unlock</div>

        {/* ── SVG edges — lives at canvas level, fills canvas, no overflow issue ── */}
        <svg
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
        >
          <defs>
            <filter id="et-glow-f" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="et-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <marker id="et-arrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="context-stroke" />
            </marker>
          </defs>
          {/* Pan+scale transform applied directly to SVG group — same as world div */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>

            {EDGES.map(([srcId, tgtId]) => {
              const p1  = WORLD[srcId];
              const p2  = WORLD[tgtId];
              if (!p1 || !p2) return null;
              const tgt = NODES.find(n => n.id === tgtId);
              const st  = edgeStateOf(srcId, tgtId);
              const rgb = branchColorOf(tgt?.branch ?? 'cross');
              const isYY = tgt?.branch === 'yinyang';
              const effectiveSt = (isYY && !yyUnlocked) ? 'dim' : st;

              // Quadratic bezier — control point pushed outward from origin so
              // all edges arc away from the tree center. Cross-branch edges get
              // a much stronger push so they route around intermediate branches.
              const src      = NODES.find(n => n.id === srcId);
              const isCross  = src?.branch === 'cross' || tgt?.branch === 'cross';
              const strength = isCross ? 260 : 55;
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;
              const mLen = Math.sqrt(mx * mx + my * my) || 1;
              const cpx = mx + (mx / mLen) * strength;
              const cpy = my + (my / mLen) * strength;

              // Offset endpoints along the bezier tangent at each tip
              const START = srcId === 'root' ? 57 : src?.keystone ? 62 : src?.branch === 'cross' ? 46 : 57;
              const STOP  = tgt?.keystone    ? 62 : tgt?.branch === 'cross' ? 46 : 57;
              const sdx = cpx - p1.x, sdy = cpy - p1.y;
              const sLen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
              const edx = p2.x - cpx, edy = p2.y - cpy;
              const eLen = Math.sqrt(edx * edx + edy * edy) || 1;
              const sx = p1.x + (sdx / sLen) * START;
              const sy = p1.y + (sdy / sLen) * START;
              const ex = p2.x - (edx / eLen) * STOP;
              const ey = p2.y - (edy / eLen) * STOP;

              const stroke =
                effectiveSt === 'active' ? `rgba(${rgb},0.9)` :
                effectiveSt === 'lit'    ? `rgba(${rgb},0.65)` :
                                           `rgba(${rgb},0.22)`;
              const sw   = effectiveSt === 'active' ? 3 : effectiveSt === 'lit' ? 2.5 : 1.5;
              const dash = effectiveSt === 'dim' ? '6 5' : undefined;
              const filter =
                effectiveSt === 'active' ? 'url(#et-glow-f)' :
                effectiveSt === 'lit'    ? 'url(#et-glow-soft)' : undefined;
              return (
                <path key={`${srcId}-${tgtId}`}
                  d={`M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`}
                  stroke={stroke} strokeWidth={sw}
                  strokeDasharray={dash} strokeLinecap="round"
                  fill="none"
                  markerEnd="url(#et-arrow)"
                  filter={filter}
                />
              );
            })}

            {/* Branch arc labels */}
            {Object.entries(BRANCH_ANGLE_DEG).map(([branch]) => {
              const lp  = branchLabelPos(branch);
              const rgb = branchColorOf(branch);
              return (
                <text key={branch}
                  x={lp.x} y={lp.y}
                  fill={`rgba(${rgb},0.55)`}
                  fontSize="12" fontWeight="700"
                  textAnchor="middle" dominantBaseline="middle"
                  style={{ userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  {BRANCHES[branch].label}
                </text>
              );
            })}

            {/* Yin Yang sealed hint */}
            {!yyUnlocked && (() => {
              const pos = WORLD['yy_1'];
              return (
                <text x={pos.x} y={pos.y - 72}
                  fill="rgba(168,85,247,0.5)" fontSize="11" fontWeight="600"
                  textAnchor="middle" dominantBaseline="middle"
                  style={{ userSelect: 'none' }}
                >
                  🔒 {keystoneCount}/2 keystones
                </text>
              );
            })()}

          </g>
        </svg>

        {/* ── Floating tooltip card — anchored to node screen position ── */}
        {activeNode && (() => {
          const pos  = WORLD[activeNode.id];
          if (!pos) return null;
          const sx   = pos.x * scale + pan.x;
          const sy   = pos.y * scale + pan.y;
          const rgb  = branchColorOf(activeNode.branch);
          const st   = nodeStateOf(activeNode);
          const isPurchased = st === 'purchased';
          return (
            <div
              className="et-node-tooltip"
              style={{ left: sx, top: sy, '--branch-rgb': rgb }}
            >
              <span className="et-node-tooltip-icon">{activeNode.icon}</span>
              <div className="et-node-tooltip-name">
                {activeNode.label}
                {activeNode.keystone && <span className="et-keystone-badge">★ Keystone</span>}
              </div>
              <div className="et-node-tooltip-desc">{activeNode.desc}</div>
              {!isPurchased && (
                <div className="et-node-tooltip-cost">{activeNode.cost} ◈</div>
              )}
              {isPurchased && (
                <div className="et-node-tooltip-cost" style={{ color: 'rgba(100,220,140,0.85)' }}>✓ Unlocked</div>
              )}
            </div>
          );
        })()}

        {/* ── HTML nodes — world div with same pan+scale transform ── */}
        <div className="et-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>

          {/* Root node */}
          <div className="et-node et-node-root" style={{ left: 0, top: 0 }}>
            <span className="et-node-icon">☯</span>
            <span className="et-node-label">Eternal Tree</span>
            <span className="et-node-sub">{karma} ◈</span>
          </div>

          {/* Game nodes */}
          {NODES.map(node => {
            const pos   = WORLD[node.id];
            if (!pos) return null;
            const state = nodeStateOf(node);
            const rgb   = branchColorOf(node.branch);
            const isSealed = state === 'sealed';

            return (
              <div
                key={node.id}
                className={`et-node et-node-${state}${node.keystone ? ' et-node-keystone' : ''}${node.branch === 'cross' ? ' et-node-cross' : ''}`}
                style={{ left: pos.x, top: pos.y, '--branch-rgb': rgb }}
                onClick={() => !isSealed && handleNodeClick(node)}
                onMouseEnter={() => !isSealed && setActiveNode(node)}
                onMouseLeave={() => setActiveNode(null)}
              >
                <span className="et-node-icon">{isSealed ? '🔒' : node.icon}</span>
                <span className="et-node-label">{node.label}</span>
                <span className="et-node-cost">
                  {purchasedSet.has(node.id) ? '✓' : isSealed ? 'Sealed' : `${node.cost} ◈`}
                </span>
                {node.keystone && !purchasedSet.has(node.id) && !isSealed && (
                  <span className="et-keystone-star">★</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Confirm overlay ── */}
      {showConfirm && (
        <div className="et-confirm-overlay">
          <div className="et-confirm-box">
            <div className="et-confirm-wheel">☸</div>
            <div className="et-confirm-title">Begin a New Life?</div>
            <div className="et-confirm-text">
              QI, realms, pills, inventory, artefacts, and techniques will be wiped.
              Karma, the Eternal Tree
              {tree.isPurchased('al_k') ? ', and your active Law' : ''} survive.
            </div>
            <div className="et-confirm-row">
              <button className="et-confirm-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="et-confirm-ok" onClick={doReincarnate}>Yes, Reincarnate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
