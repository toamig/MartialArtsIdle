import { useState, useRef, useEffect, useCallback } from 'react';
import { NODES, NODE_DESCRIPTIONS, SAINT_UNLOCK_INDEX, PEAK_INDEX, TREE_TOTAL_COST } from '../data/reincarnationTree';

const NODE_ICONS = {
  pills2x:   '💊',
  mining2x:  '⛏️',
  gather2x:  '🌿',
  focus3x:   '🧘',
  heaven2x:  '✨',
  stones3x:  '💎',
  damage3x:  '⚔️',
  stats1000: '💪',
  qis2x:     '🌀',
};

// World-space centres for every node (root = origin)
const WORLD = {
  root:      { x:    0, y:    0 },
  pills2x:   { x: -260, y:  230 },
  mining2x:  { x:    0, y:  230 },
  gather2x:  { x:  260, y:  230 },
  focus3x:   { x: -260, y:  460 },
  heaven2x:  { x:    0, y:  460 },
  stones3x:  { x:  260, y:  460 },
  damage3x:  { x: -260, y:  690 },
  stats1000: { x:    0, y:  690 },
  qis2x:     { x:  260, y:  690 },
};

// Directed edges: [child, parent] drawn from parent → child
const EDGES = [
  ['root',     'pills2x'],
  ['root',     'mining2x'],
  ['root',     'gather2x'],
  ['pills2x',  'focus3x'],
  ['pills2x',  'heaven2x'],
  ['mining2x', 'focus3x'],
  ['mining2x', 'heaven2x'],
  ['mining2x', 'stones3x'],
  ['gather2x', 'heaven2x'],
  ['gather2x', 'stones3x'],
  ['focus3x',  'damage3x'],
  ['focus3x',  'stats1000'],
  ['heaven2x', 'damage3x'],
  ['heaven2x', 'stats1000'],
  ['heaven2x', 'qis2x'],
  ['stones3x', 'stats1000'],
  ['stones3x', 'qis2x'],
];

// Tooltip shown for a node (fixed panel below HUD)
function NodeTooltip({ node }) {
  if (!node) return null;
  return (
    <div className="et-tooltip-panel">
      <span className="et-tooltip-icon">{NODE_ICONS[node.id]}</span>
      <div className="et-tooltip-body">
        <div className="et-tooltip-name">{node.label}</div>
        <div className="et-tooltip-desc">{NODE_DESCRIPTIONS[node.id]}</div>
      </div>
    </div>
  );
}

export default function EternalTreeScreen({
  karma, tree, lives,
  highestReached, peakKarmaTotal,
  realmIndex,
  onReincarnate, onClose,
}) {
  const canvasRef   = useRef(null);
  const dragRef     = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const [pan,       setPan]       = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState(null); // for tooltip
  const [showConfirm, setShowConfirm] = useState(false);
  const [infoOpen,    setInfoOpen]    = useState(false);

  // Centre root node on first render
  useEffect(() => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    setPan({ x: width / 2, y: Math.min(100, height * 0.12) });
  }, []);

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.et-node')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
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
  }, []);

  const canReincarnateNow = realmIndex >= SAINT_UNLOCK_INDEX;

  const doReincarnate = () => {
    setShowConfirm(false);
    onReincarnate();
    onClose();
  };

  const handleNodeClick = (node) => {
    if (tree.canBuy(node.id)) {
      tree.buy(node.id);
      return;
    }
    // Tap to show/hide tooltip on non-buyable nodes
    setActiveNode(prev => prev?.id === node.id ? null : node);
  };

  const handleNodeEnter = (node) => setActiveNode(node);
  const handleNodeLeave = () => setActiveNode(null);

  const purchasedIds = new Set(NODES.filter(n => tree.isPurchased(n.id)).map(n => n.id));

  return (
    <div className="et-screen">

      {/* ── Top HUD ── */}
      <div className="et-hud">
        <span className="et-hud-icon">☸</span>
        <div className="et-hud-title">Eternal Tree</div>
        <div className="et-hud-divider" />
        <div className="et-hud-karma">
          <span className="et-hud-karma-gem">◈</span>
          {karma}
        </div>
        <div className="et-hud-lives">Lives: {lives}</div>
        <div className="et-hud-spacer" />
        <button className="et-info-btn" onClick={() => setInfoOpen(o => !o)} aria-label="Info">
          ℹ
        </button>
        {canReincarnateNow && (
          <button className="et-reinc-btn" onClick={() => setShowConfirm(true)}>
            ☸ Reincarnate
          </button>
        )}
        <button className="et-close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* ── Info panel ── */}
      {infoOpen && (
        <div className="et-info-panel">
          <div className="et-info-cols">
            <div className="et-info-col et-info-col-lost">
              <div className="et-info-col-title">Lost on Rebirth</div>
              <ul>
                <li>QI &amp; cultivation progress</li>
                <li>Inventory &amp; materials</li>
                <li>Artefacts &amp; techniques</li>
                <li>Pills &amp; discoveries</li>
              </ul>
            </div>
            <div className="et-info-col et-info-col-kept">
              <div className="et-info-col-title">Survives Rebirth</div>
              <ul>
                <li>Active Law</li>
                <li>Karma &amp; this tree</li>
                <li>Lives counter</li>
              </ul>
            </div>
            <div className="et-info-col">
              <div className="et-info-col-title">Progress</div>
              <ul>
                <li>Peak: {highestReached} / {PEAK_INDEX}</li>
                <li>Full peak: {peakKarmaTotal} ◈</li>
                <li>Full tree: {TREE_TOTAL_COST} ◈</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Node tooltip strip ── */}
      <NodeTooltip node={activeNode} />

      {/* ── Pan canvas ── */}
      <div
        className={`et-canvas${dragRef.current.active ? ' et-canvas-dragging' : ''}`}
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Hint */}
        <div className="et-hint">Drag to explore · Tap a glowing node to unlock</div>

        <div
          className="et-world"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* SVG connector lines — overflow:visible so lines extend outside 0×0 origin */}
          <svg className="et-svg" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'visible' }}>
            <defs>
              <filter id="et-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {EDGES.map(([parentId, childId]) => {
              const p1 = WORLD[parentId];
              const p2 = WORLD[childId];
              if (!p1 || !p2) return null;
              const p1Owned = parentId === 'root' || purchasedIds.has(parentId);
              const p2Owned = purchasedIds.has(childId);
              const active  = p1Owned && p2Owned;
              const lit     = p1Owned;
              return (
                <line
                  key={`${parentId}-${childId}`}
                  x1={p1.x} y1={p1.y}
                  x2={p2.x} y2={p2.y}
                  className={`et-edge${active ? ' et-edge-active' : lit ? ' et-edge-lit' : ''}`}
                  filter={active ? 'url(#et-glow)' : undefined}
                />
              );
            })}
          </svg>

          {/* Root node */}
          <div className="et-node et-node-root" style={{ left: WORLD.root.x, top: WORLD.root.y }}>
            <span className="et-node-icon">🌳</span>
            <span className="et-node-label">Eternal Tree</span>
            <span className="et-node-sub">Spend karma here</span>
          </div>

          {/* Game nodes */}
          {NODES.map(node => {
            const pos        = WORLD[node.id];
            if (!pos) return null;
            const purchased  = tree.isPurchased(node.id);
            const available  = tree.isAvailable(node.id);
            const affordable = tree.canBuy(node.id);
            const state = purchased    ? 'purchased'
              : available ? (affordable ? 'affordable' : 'locked-cost')
              : 'locked-prereq';

            return (
              <div
                key={node.id}
                className={`et-node et-node-${state}`}
                style={{ left: pos.x, top: pos.y }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => handleNodeEnter(node)}
                onMouseLeave={handleNodeLeave}
              >
                <span className="et-node-icon">{NODE_ICONS[node.id]}</span>
                <span className="et-node-label">{node.label}</span>
                <span className="et-node-cost">
                  {purchased ? '✓ Owned' : `${node.cost} ◈`}
                </span>
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
              Your active Law, Karma, and the Eternal Tree survive.
            </div>
            <div className="et-confirm-row">
              <button className="et-confirm-cancel" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button className="et-confirm-ok" onClick={doReincarnate}>
                Yes, Reincarnate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
