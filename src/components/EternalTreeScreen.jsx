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

// Radial distance per sequential step within a branch
const STEP_R = [220, 390, 560, 730, 900, 1070];

// Cross-branch connector positions (hardcoded, between their keystones)
const CROSS_POS = {
  cb_is: { angleDeg: 178,   r: 750 }, // AL★ + HW — left
  cb_ts: { angleDeg: 2.5,   r: 750 }, // MD★ + FP★ — right
  cb_pt: { angleDeg: 337.5, r: 700 }, // MD★ + YY — lower-right
};

function degToRad(d) { return d * Math.PI / 180; }

function radialXY(angleDeg, r) {
  const a = degToRad(angleDeg);
  return { x: Math.round(r * Math.cos(a)), y: Math.round(-r * Math.sin(a)) };
}

// Compute world position for every node
const WORLD = { root: { x: 0, y: 0 } };
for (const node of NODES) {
  if (node.branch === 'cross') {
    const cp = CROSS_POS[node.id];
    WORLD[node.id] = radialXY(cp.angleDeg, cp.r);
  } else {
    const angleDeg = BRANCH_ANGLE_DEG[node.branch];
    WORLD[node.id] = radialXY(angleDeg, STEP_R[node.step]);
  }
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
  const r        = (STEP_R[0] + STEP_R[1]) / 2;
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
  const [pan,         setPan]         = useState({ x: 0, y: 0 });
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

      {/* ── HUD ── */}
      <div className="et-hud">
        <span className="et-hud-icon">☸</span>
        <div className="et-hud-title">Eternal Tree</div>
        <div className="et-hud-divider" />
        <div className="et-hud-karma"><span className="et-hud-karma-gem">◈</span>{karma}</div>
        <div className="et-hud-lives">Lives: {lives}</div>
        <div className="et-hud-spacer" />
        <button className="et-info-btn" onClick={() => setInfoOpen(o => !o)} aria-label="Info">ℹ</button>
        {canReincarnateNow && (
          <button className="et-reinc-btn" onClick={() => setShowConfirm(true)}>☸ Reincarnate</button>
        )}
        <button className="et-close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* ── Info panel ── */}
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

      {/* ── Tooltip strip ── */}
      {activeNode && (
        <div className="et-tooltip-panel" style={{ '--branch-color': `rgb(${branchColorOf(activeNode.branch)})` }}>
          <span className="et-tooltip-icon">{activeNode.icon}</span>
          <div className="et-tooltip-body">
            <div className="et-tooltip-name">{activeNode.label}
              {activeNode.keystone && <span className="et-keystone-badge">★ Keystone</span>}
            </div>
            <div className="et-tooltip-desc">{activeNode.desc}</div>
            <div className="et-tooltip-cost">{activeNode.cost} ◈ karma</div>
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
        <div className="et-hint">Drag to explore · Tap a glowing node to unlock</div>

        <div className="et-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>

          {/* SVG: edges + branch labels */}
          <svg style={{ position:'absolute', left:0, top:0, width:0, height:0, overflow:'visible', pointerEvents:'none' }}>
            <defs>
              <filter id="et-glow-f" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {EDGES.map(([srcId, tgtId]) => {
              const p1  = WORLD[srcId];
              const p2  = WORLD[tgtId];
              if (!p1 || !p2) return null;
              const tgt = NODES.find(n => n.id === tgtId);
              const st  = edgeStateOf(srcId, tgtId);
              const rgb = branchColorOf(tgt?.branch ?? 'cross');
              // Sealed YY edges always dimmed
              const isYY = tgt?.branch === 'yinyang';
              const effectiveSt = (isYY && !yyUnlocked) ? 'dim' : st;
              const stroke =
                effectiveSt === 'active' ? `rgba(${rgb},0.8)` :
                effectiveSt === 'lit'    ? `rgba(${rgb},0.45)` :
                                           `rgba(${rgb},0.14)`;
              const sw    = effectiveSt === 'active' ? 3 : 2;
              const dash  = effectiveSt === 'dim' ? '5 5' : undefined;
              return (
                <line key={`${srcId}-${tgtId}`}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={stroke} strokeWidth={sw}
                  strokeDasharray={dash} strokeLinecap="round"
                  filter={effectiveSt === 'active' ? 'url(#et-glow-f)' : undefined}
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

            {/* Yin Yang sealed ring hint */}
            {!yyUnlocked && (() => {
              const pos = WORLD['yy_1'];
              return (
                <text x={pos.x} y={pos.y - 68}
                  fill="rgba(168,85,247,0.45)" fontSize="11" fontWeight="600"
                  textAnchor="middle" dominantBaseline="middle"
                  style={{ userSelect: 'none' }}
                >
                  🔒 {keystoneCount}/2 keystones
                </text>
              );
            })()}
          </svg>

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
                style={{
                  left: pos.x,
                  top:  pos.y,
                  '--branch-rgb': rgb,
                }}
                onClick={() => !isSealed && handleNodeClick(node)}
                onMouseEnter={() => !isSealed && setActiveNode(node)}
                onMouseLeave={() => setActiveNode(null)}
              >
                <span className="et-node-icon">{isSealed ? '🔒' : node.icon}</span>
                <span className="et-node-label">{node.label}</span>
                <span className="et-node-cost">
                  {purchasedSet.has(node.id) ? '✓ Owned' : isSealed ? 'Sealed' : `${node.cost} ◈`}
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
