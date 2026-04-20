import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NODES, BRANCHES, MAIN_KEYSTONES, TREE_TOTAL_COST, SAINT_UNLOCK_INDEX } from '../data/reincarnationTree';

const EDIT_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('treeEdit');

function worldToPolar(x, y) {
  const deg = Math.round(((Math.atan2(-y, x) * 180 / Math.PI) + 360) % 360);
  const r   = Math.round(Math.sqrt(x * x + y * y));
  return [deg, r];
}

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
  md_1: [55, 222], md_2: [27, 402], md_3: [57, 571], md_4: [40, 745], md_k: [49, 933],
  al_1: [123, 218], al_2: [149, 405], al_3: [121, 571], al_4: [136, 752], al_k: [129, 944],
  hw_1: [207, 226], hw_2: [199, 475], hw_3: [232, 549], hw_4: [212, 744], hw_k: [227, 926],
  fp_1: [329, 229], fp_2: [335, 475], fp_3: [302, 512], fp_4: [324, 714], fp_k: [308, 891],
  yy_1: [268, 233], yy_2: [269, 447], yy_3: [269, 672], yy_4: [269, 902], yy_k: [269, 1132],
  cb_is: [174, 803], cb_ts: [2, 800], cb_pt: [91, 828],
};

// Compute world position for every node
const WORLD = { root: { x: 0, y: 0 } };
for (const node of NODES) {
  const [a, r] = NODE_POS[node.id];
  WORLD[node.id] = radialXY(a, r);
}

// Bounding box of all node centers in world space (used for pan clamping)
const WORLD_BOUNDS = (() => {
  const xs = Object.values(WORLD).map(p => p.x);
  const ys = Object.values(WORLD).map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
})();

// Clamp pan so no outermost node center can cross the canvas midpoint on any side.
function clampPan(px, py, sc, cw, ch) {
  const cx = cw / 2, cy = ch / 2;
  return {
    x: Math.max(cx - WORLD_BOUNDS.maxX * sc, Math.min(cx - WORLD_BOUNDS.minX * sc, px)),
    y: Math.max(cy - WORLD_BOUNDS.maxY * sc, Math.min(cy - WORLD_BOUNDS.minY * sc, py)),
  };
}

// Build edge list: [sourceId, targetId]
const EDGES = [];
for (const node of NODES) {
  if (node.step === 0 && node.branch !== 'cross') {
    EDGES.push(['root', node.id]);
  }
  for (const prereqId of node.prereqs) {
    EDGES.push([prereqId, node.id]);
  }
}

// Cubic bezier overrides for edges that must route around the outer perimeter.
// cp1 = control point near the source (heavy outward push, sets exit tangent).
// cp2 = control point near the destination (lighter, sets arrival angle).
// Entries with cp1+cp2 → cubic bezier. Entries with cp → quadratic override.
const CUSTOM_CP = {
  'fp_k-cb_pt': { cp1: { x: 1688, y: 278 }, cp2: { x: 894, y: -1398 } },
  'hw_k-cb_pt': { cp1: { x: -1516, y: 144 }, cp2: { x: -1004, y: -1438 } },
  'hw_1-hw_2': { cp: { x: -301.3604366436874, y: 175.17499803735103 } },
  'root-hw_1': { cp: { x: -117.32105904867339, y: 11.29940074913084 } },
  'yy_1-yy_2': { cp: { x: -75, y: 340.5 } },
  'yy_2-yy_3': { cp: { x: 60, y: 551.5 } },
  'yy_3-yy_4': { cp: { x: -77, y: 787.5 } },
  'yy_4-yy_k': { cp: { x: 44.36160084079145, y: 1013.4998258694764 } },
  'hw_2-hw_3': { cp: { x: -446.5603902111898, y: 316.9193258502918 } },
  'hw_3-hw_4': { cp: { x: -485.3352072150303, y: 468.20455765410736 } },
  'hw_4-hw_k': { cp: { x: -678.4484274652293, y: 533.0714693707527 } },
  'hw_1-cb_is': { cp: { x: -446.99899528497485, y: -132.38929324719464 } },
  'al_k-cb_is': { cp: { x: -821.6258544449504, y: -476.2956784883961 } },
  'al_4-al_k': { cp: { x: -613.3755551309265, y: -598.8067817131663 } },
  'al_3-al_4': { cp: { x: -413.5241435055454, y: -549.9064779450376 } },
  'al_2-al_3': { cp: { x: -371.6964745939491, y: -359.5144699802638 } },
  'al_1-al_2': { cp: { x: -224.1030403434513, y: -236.3883313231595 } },
  'root-al_1': { cp: { x: -69.48321496159757, y: -68.60864149556602 } },
  'root-md_1': { cp: { x: 77.85544489868374, y: -61.84522869604206 } },
  'md_1-md_2': { cp: { x: 239.66894460279246, y: -224.08871122486315 } },
  'md_2-md_3': { cp: { x: 379.5948673215318, y: -345.6858029399911 } },
  'md_3-md_4': { cp: { x: 438.2527468544508, y: -521.4627341117504 } },
  'md_4-md_k': { cp: { x: 629.3908729652601, y: -576.3908729652601 } },
  'root-fp_1': { cp: { x: 119.59135519469135, y: 22.49237505660983 } },
  'fp_1-fp_2': { cp: { x: 304.1522114497628, y: 206.57751930668724 } },
  'fp_4-fp_k': { cp: { x: 618.4772392296412, y: 561.8043144770696 } },
  'fp_3-fp_4': { cp: { x: 442.27652241714964, y: 482.0048882735522 } },
  'fp_2-fp_3': { cp: { x: 402.48082888952626, y: 347.2330833052663 } },
  'fp_k-cb_ts': { cp: { x: 882.2893648023402, y: 399.73416009699304 } },
  'md_k-cb_ts': { cp: { x: 936.3094528070163, y: -446.54458312527225 } },
  'md_k-cb_pt': { cp: { x: 335.5411241582807, y: -965.2023448335885 } },
  'al_k-cb_pt': { cp: { x: -359.3108785884939, y: -971.2920926895188 } },
  'root-yy_1': { cp: { x: -4.87250055008775, y: 151.6804472789622 } },
};

// Brief descriptions shown in the branch legend panel on hover/tap
const BRANCH_DESC = {
  legacy:  'Carry knowledge and resources — start each new life with a head-start.',
  martial: 'Stronger in every fight — better techniques, exploit power, and killing edge.',
  fate:    'Bend luck — rarer drops, better craft rolls, and more Selections to pick from.',
  will:    'Forge an unbreakable body — raw stats, HP, and resilience that compound each life.',
  yinyang: 'Balanced mastery — amplifies everything once you own 2 branch keystones.',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function EternalTreeScreen({
  karma, tree, lives,
  highestReached, peakKarmaTotal,
  realmIndex,
  onReincarnate, onClose,
}) {
  const canvasRef     = useRef(null);
  const dragRef       = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const scaleRef      = useRef(1);
  const canvasSizeRef = useRef({ w: 0, h: 0 });
  const [pan,           setPan]           = useState({ x: 0, y: 0 });
  const [scale,         setScale]         = useState(1);
  const [isDragging,    setIsDragging]    = useState(false);
  const [activeNode,    setActiveNode]    = useState(null);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [infoOpen,      setInfoOpen]      = useState(false);
  const [hoveredBranch,    setHoveredBranch]    = useState(null);
  const [branchTooltipPos, setBranchTooltipPos] = useState({ x: 0, y: 0 });

  // ── Editor state (only meaningful when EDIT_MODE) ─────────────────────────
  const editorDragRef = useRef({ active: false });
  const [editPos, setEditPos] = useState(() => {
    if (!EDIT_MODE) return {};
    return Object.fromEntries(NODES.map(n => [n.id, { ...WORLD[n.id] }]));
  });
  const [editCP, setEditCP] = useState(() => {
    if (!EDIT_MODE) return {};
    return JSON.parse(JSON.stringify(CUSTOM_CP));
  });
  const [copied, setCopied] = useState(null);

  // Centre the root on mount; track canvas size for pan clamping
  useEffect(() => {
    if (!canvasRef.current) return;
    const syncSize = () => {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      canvasSizeRef.current = { w: width, h: height };
    };
    syncSize();
    const { w, h } = canvasSizeRef.current;
    setPan({ x: Math.round(w / 2), y: Math.round(h * 0.28) });
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
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
      const next   = Math.max(0.5, Math.min(1.75, prev * factor));
      scaleRef.current = next;
      setScale(next);
      setPan(p => clampPan(
        cx - (cx - p.x) * (next / prev),
        cy - (cy - p.y) * (next / prev),
        next, rect.width, rect.height,
      ));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // Panning (+ editor drag)
  const onPointerDown = useCallback((e) => {
    if (EDIT_MODE) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const wx = (e.clientX - rect.left - pan.x) / scale;
        const wy = (e.clientY - rect.top  - pan.y) / scale;
        // Cubic CP handles (cp1 / cp2)
        for (const [edgeKey, cps] of Object.entries(editCP)) {
          if (!cps.cp1 || !cps.cp2) continue;
          for (const which of ['cp1', 'cp2']) {
            const cp = cps[which];
            if (Math.hypot(wx - cp.x, wy - cp.y) < 60) {
              editorDragRef.current = { active: true, type: 'cp', id: edgeKey, which, startX: e.clientX, startY: e.clientY, startWx: cp.x, startWy: cp.y };
              e.currentTarget.setPointerCapture(e.pointerId);
              return;
            }
          }
        }
        // Quadratic CPs — overridden ones first (larger hit), then auto-computed
        const getEP = (id) => id === 'root' ? { x: 0, y: 0 } : (editPos[id] ?? WORLD[id]);
        for (const [srcId, tgtId] of EDGES) {
          const ep1 = getEP(srcId), ep2 = getEP(tgtId);
          if (!ep1 || !ep2) continue;
          const edgeKey = `${srcId}-${tgtId}`;
          const cust = editCP[edgeKey];
          if (cust?.cp1 && cust?.cp2) continue; // cubic — handled above
          let cpx, cpy;
          if (cust?.cp) {
            cpx = cust.cp.x; cpy = cust.cp.y;
          } else {
            const tgtNode = NODES.find(n => n.id === tgtId);
            const srcNode = NODES.find(n => n.id === srcId);
            const isCr = srcNode?.branch === 'cross' || tgtNode?.branch === 'cross';
            const strength = isCr ? 260 : 55;
            const mx = (ep1.x + ep2.x) / 2, my = (ep1.y + ep2.y) / 2;
            const mLen = Math.sqrt(mx*mx + my*my) || 1;
            cpx = mx + (mx/mLen)*strength; cpy = my + (my/mLen)*strength;
          }
          const hitR = cust?.cp ? 45 : 18;
          if (Math.hypot(wx - cpx, wy - cpy) < hitR) {
            editorDragRef.current = { active: true, type: 'cp', id: edgeKey, which: 'cp', startX: e.clientX, startY: e.clientY, startWx: cpx, startWy: cpy };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
        // Nodes
        for (const node of NODES) {
          const pos = editPos[node.id];
          if (!pos) continue;
          if (Math.hypot(wx - pos.x, wy - pos.y) < 70) {
            editorDragRef.current = { active: true, type: 'node', id: node.id, startX: e.clientX, startY: e.clientY, startWx: pos.x, startWy: pos.y };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }
    if (e.target.closest('.et-node')) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pan, scale, editPos, editCP]);

  const onPointerMove = useCallback((e) => {
    if (EDIT_MODE && editorDragRef.current.active) {
      const d  = editorDragRef.current;
      const dx = Math.round((e.clientX - d.startX) / scale);
      const dy = Math.round((e.clientY - d.startY) / scale);
      if (d.type === 'node') {
        setEditPos(prev => ({ ...prev, [d.id]: { x: d.startWx + dx, y: d.startWy + dy } }));
      } else {
        setEditCP(prev => ({
          ...prev,
          [d.id]: { ...prev[d.id], [d.which]: { x: d.startWx + dx, y: d.startWy + dy } },
        }));
      }
      return;
    }
    if (!dragRef.current.active) return;
    const { w, h } = canvasSizeRef.current;
    setPan(clampPan(
      dragRef.current.panX + (e.clientX - dragRef.current.startX),
      dragRef.current.panY + (e.clientY - dragRef.current.startY),
      scaleRef.current, w, h,
    ));
  }, [scale]);

  const onPointerUp = useCallback(() => {
    editorDragRef.current.active = false;
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
  const purchasedSet  = tree.purchased;
  const keystoneCount = MAIN_KEYSTONES.filter(k => purchasedSet.has(k)).length;
  const yyUnlocked    = keystoneCount >= 2;

  const edgeStateOf = useCallback((sourceId, targetId) => {
    const srcOwned = sourceId === 'root' || purchasedSet.has(sourceId);
    const tgtOwned = purchasedSet.has(targetId);
    if (srcOwned && tgtOwned) return 'active';
    if (srcOwned)             return 'lit';
    return 'dim';
  }, [purchasedSet]);

  const nodeStateOf = useCallback((node) => {
    if (purchasedSet.has(node.id)) return 'purchased';
    if (node.branch === 'yinyang' && !yyUnlocked) return 'sealed';
    if (tree.isAvailable(node.id)) return tree.canBuy(node.id) ? 'affordable' : 'locked-cost';
    return 'locked-prereq';
  }, [purchasedSet, yyUnlocked, tree]);

  const branchColorOf = (branchId) => BRANCHES[branchId]?.colorRgb ?? '148,163,184';

  // In editor mode use mutable copies; otherwise use the static constants.
  const activeWorld = EDIT_MODE ? { root: { x: 0, y: 0 }, ...editPos } : WORLD;
  const activeCP    = EDIT_MODE ? editCP : CUSTOM_CP;

  const nodePosJson = useMemo(() => {
    if (!EDIT_MODE) return '';
    const order = ['martial', 'legacy', 'will', 'fate', 'yinyang', 'cross'];
    const lines  = order.map(branch =>
      '  ' + NODES.filter(n => n.branch === branch).map(n => {
        const p = editPos[n.id] ?? WORLD[n.id];
        const [a, r] = worldToPolar(p.x, p.y);
        return `${n.id}: [${a}, ${r}]`;
      }).join(', ')
    );
    return `const NODE_POS = {\n${lines.join(',\n')},\n};`;
  }, [editPos]);

  const customCPJson = useMemo(() => {
    if (!EDIT_MODE) return '';
    const entries = Object.entries(editCP).map(([k, entry]) => {
      if (entry.cp1 && entry.cp2) {
        const { cp1, cp2 } = entry;
        return `  '${k}': { cp1: { x: ${cp1.x}, y: ${cp1.y} }, cp2: { x: ${cp2.x}, y: ${cp2.y} } }`;
      }
      if (entry.cp) {
        return `  '${k}': { cp: { x: ${entry.cp.x}, y: ${entry.cp.y} } }`;
      }
      return null;
    }).filter(Boolean);
    return `const CUSTOM_CP = {\n${entries.join(',\n')},\n};`;
  }, [editCP]);

  const doCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const doSave = async () => {
    try {
      const res = await fetch('/__tree-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodePosBlock: nodePosJson, customCPBlock: customCPJson }),
      });
      const data = await res.json();
      setCopied(data.ok ? 'saved' : 'error');
    } catch {
      setCopied('error');
    }
    setTimeout(() => setCopied(null), 2200);
  };

  return (
    <div className="et-screen">

      {/* ── Left sidebar: card + branch legend ── */}
      <div className="et-sidebar">

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

        {/* Branch legend — hover/tap shows floating tooltip to the right */}
        <div className="et-branch-legend">
          {Object.entries(BRANCHES)
            .filter(([b]) => b !== 'cross')
            .map(([branchId, branch]) => {
              const sealed = branchId === 'yinyang' && !yyUnlocked;
              const openTooltip = (e) => {
                const itemRect    = e.currentTarget.getBoundingClientRect();
                const sidebarRect = e.currentTarget.closest('.et-sidebar').getBoundingClientRect();
                setBranchTooltipPos({ x: sidebarRect.right + 8, y: itemRect.top + itemRect.height / 2 });
                setHoveredBranch(branchId);
              };
              return (
                <div
                  key={branchId}
                  className={`et-branch-item${sealed ? ' et-branch-item-sealed' : ''}`}
                  style={{ '--branch-rgb': branch.colorRgb }}
                  onMouseEnter={openTooltip}
                  onMouseLeave={() => setHoveredBranch(null)}
                  onClick={(e) => hoveredBranch === branchId ? setHoveredBranch(null) : openTooltip(e)}
                >
                  <span className="et-branch-dot" />
                  <span className="et-branch-name">{branch.label}</span>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* ── Branch description tooltip — floats to the right of the sidebar ── */}
      {hoveredBranch && (
        <div
          className="et-branch-tooltip"
          style={{
            left: branchTooltipPos.x,
            top:  branchTooltipPos.y,
            '--branch-rgb': BRANCHES[hoveredBranch]?.colorRgb,
          }}
        >
          {(hoveredBranch === 'yinyang' && !yyUnlocked)
            ? `🔒 ${BRANCH_DESC[hoveredBranch]}`
            : BRANCH_DESC[hoveredBranch]
          }
        </div>
      )}

      {/* ── Info panel — absolute overlay anchored to right of sidebar ── */}
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
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>

            {EDGES.map(([srcId, tgtId]) => {
              const p1  = activeWorld[srcId];
              const p2  = activeWorld[tgtId];
              if (!p1 || !p2) return null;
              const tgt = NODES.find(n => n.id === tgtId);
              const st  = edgeStateOf(srcId, tgtId);
              const rgb = branchColorOf(tgt?.branch ?? 'cross');
              const isYY = tgt?.branch === 'yinyang';
              const effectiveSt = (isYY && !yyUnlocked) ? 'dim' : st;

              const src     = NODES.find(n => n.id === srcId);
              const isCross = src?.branch === 'cross' || tgt?.branch === 'cross';
              const edgeKey = `${srcId}-${tgtId}`;
              const custom  = activeCP[edgeKey];

              const START = srcId === 'root' ? 57 : src?.keystone ? 62 : src?.branch === 'cross' ? 46 : 57;
              const STOP  = tgt?.keystone    ? 62 : tgt?.branch === 'cross' ? 46 : 57;

              let pathD;
              if (custom?.cp1 && custom?.cp2) {
                // Cubic bezier — two independent control points.
                const { cp1, cp2 } = custom;
                const sdx = cp1.x - p1.x, sdy = cp1.y - p1.y;
                const sLen = Math.sqrt(sdx*sdx + sdy*sdy) || 1;
                const edx = p2.x - cp2.x, edy = p2.y - cp2.y;
                const eLen = Math.sqrt(edx*edx + edy*edy) || 1;
                const sx = p1.x + (sdx/sLen) * START, sy = p1.y + (sdy/sLen) * START;
                const ex = p2.x - (edx/eLen) * STOP,  ey = p2.y - (edy/eLen) * STOP;
                pathD = `M ${sx} ${sy} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${ex} ${ey}`;
              } else {
                // Quadratic bezier — single CP, auto-computed or manually overridden.
                let cpx, cpy;
                if (custom?.cp) {
                  cpx = custom.cp.x; cpy = custom.cp.y;
                } else {
                  const strength = isCross ? 260 : 55;
                  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
                  const mLen = Math.sqrt(mx*mx + my*my) || 1;
                  cpx = mx + (mx/mLen) * strength; cpy = my + (my/mLen) * strength;
                }
                const sdx = cpx - p1.x, sdy = cpy - p1.y;
                const sLen = Math.sqrt(sdx*sdx + sdy*sdy) || 1;
                const edx = p2.x - cpx, edy = p2.y - cpy;
                const eLen = Math.sqrt(edx*edx + edy*edy) || 1;
                const sx = p1.x + (sdx/sLen) * START, sy = p1.y + (sdy/sLen) * START;
                const ex = p2.x - (edx/eLen) * STOP,  ey = p2.y - (edy/eLen) * STOP;
                pathD = `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`;
              }

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
                <path key={edgeKey}
                  d={pathD}
                  stroke={stroke} strokeWidth={sw}
                  strokeDasharray={dash} strokeLinecap="round"
                  fill="none"
                  markerEnd="url(#et-arrow)"
                  filter={filter}
                />
              );
            })}

            {/* Editor: handles for all edge control points */}
            {EDIT_MODE && (() => {
              const getEP2 = (id) => id === 'root' ? { x: 0, y: 0 } : (activeWorld[id]);
              return EDGES.map(([srcId, tgtId]) => {
                const p1 = getEP2(srcId), p2 = getEP2(tgtId);
                if (!p1 || !p2) return null;
                const edgeKey = `${srcId}-${tgtId}`;
                const cust = activeCP[edgeKey];

                if (cust?.cp1 && cust?.cp2) {
                  // ── Cubic: two coloured handles + guide lines ──
                  const { cp1, cp2 } = cust;
                  return (
                    <g key={`ed-${edgeKey}`} style={{ pointerEvents: 'none' }}>
                      <line x1={p1.x} y1={p1.y} x2={cp1.x} y2={cp1.y} stroke="rgba(0,200,255,0.45)" strokeWidth={1.5} strokeDasharray="5 4" />
                      <line x1={p2.x} y1={p2.y} x2={cp2.x} y2={cp2.y} stroke="rgba(255,160,0,0.45)"  strokeWidth={1.5} strokeDasharray="5 4" />
                      <circle cx={cp1.x} cy={cp1.y} r={14} fill="rgba(0,180,255,0.85)"  stroke="#fff" strokeWidth={1.5} />
                      <text x={cp1.x} y={cp1.y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">1</text>
                      <circle cx={cp2.x} cy={cp2.y} r={14} fill="rgba(255,140,0,0.85)"  stroke="#fff" strokeWidth={1.5} />
                      <text x={cp2.x} y={cp2.y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">2</text>
                    </g>
                  );
                }

                // ── Quadratic: single CP dot (bright if overridden, faint if auto) ──
                let cpx, cpy;
                if (cust?.cp) {
                  cpx = cust.cp.x; cpy = cust.cp.y;
                } else {
                  const srcNode = NODES.find(n => n.id === srcId);
                  const tgtNode = NODES.find(n => n.id === tgtId);
                  const isCr = srcNode?.branch === 'cross' || tgtNode?.branch === 'cross';
                  const strength = isCr ? 260 : 55;
                  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
                  const mLen = Math.sqrt(mx*mx + my*my) || 1;
                  cpx = mx + (mx/mLen)*strength; cpy = my + (my/mLen)*strength;
                }
                const overridden = !!cust?.cp;
                return (
                  <g key={`ed-${edgeKey}`} style={{ pointerEvents: 'none' }}>
                    {overridden && <>
                      <line x1={p1.x} y1={p1.y} x2={cpx} y2={cpy} stroke="rgba(200,200,255,0.35)" strokeWidth={1} strokeDasharray="4 3" />
                      <line x1={p2.x} y1={p2.y} x2={cpx} y2={cpy} stroke="rgba(200,200,255,0.35)" strokeWidth={1} strokeDasharray="4 3" />
                    </>}
                    <circle cx={cpx} cy={cpy}
                      r={overridden ? 12 : 6}
                      fill={overridden ? 'rgba(220,220,255,0.9)' : 'rgba(100,100,180,0.45)'}
                      stroke={overridden ? '#fff' : 'rgba(180,180,255,0.4)'}
                      strokeWidth={overridden ? 1.5 : 1} />
                    {overridden && <text x={cpx} y={cpy + 4} textAnchor="middle" fill="#222" fontSize="9" fontWeight="700">Q</text>}
                  </g>
                );
              });
            })()}

            {/* Yin Yang sealed hint */}
            {!yyUnlocked && (() => {
              const pos = activeWorld['yy_1'];
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

        {/* ── Floating tooltip — anchored to node screen position ── */}
        {activeNode && (() => {
          const pos  = activeWorld[activeNode.id];
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

        {/* ── HTML nodes ── */}
        <div className="et-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>

          <div className="et-node et-node-root" style={{ left: 0, top: 0 }}>
            <span className="et-node-icon">☯</span>
            <span className="et-node-label">Eternal Tree</span>
            <span className="et-node-sub">{karma} ◈</span>
          </div>

          {NODES.map(node => {
            const pos   = activeWorld[node.id];
            if (!pos) return null;
            const state = nodeStateOf(node);
            const rgb   = branchColorOf(node.branch);
            const isSealed = state === 'sealed';
            const [edA, edR] = EDIT_MODE ? worldToPolar(pos.x, pos.y) : [0, 0];

            return (
              <div
                key={node.id}
                className={`et-node et-node-${state}${node.keystone ? ' et-node-keystone' : ''}${node.branch === 'cross' ? ' et-node-cross' : ''}${EDIT_MODE ? ' et-node-editable' : ''}`}
                style={{ left: pos.x, top: pos.y, '--branch-rgb': rgb }}
                onClick={() => !isSealed && !EDIT_MODE && handleNodeClick(node)}
                onMouseEnter={() => !isSealed && !EDIT_MODE && setActiveNode(node)}
                onMouseLeave={() => !EDIT_MODE && setActiveNode(null)}
              >
                <span className="et-node-icon">{isSealed ? '🔒' : node.icon}</span>
                <span className="et-node-label">{EDIT_MODE ? node.id : node.label}</span>
                <span className="et-node-cost">
                  {EDIT_MODE ? `${edA}° r${edR}` : purchasedSet.has(node.id) ? '✓' : isSealed ? 'Sealed' : `${node.cost} ◈`}
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

      {/* ── Tree editor panel (only in ?treeEdit=1 mode) ── */}
      {EDIT_MODE && (
        <div className="et-editor-panel">
          <div className="et-editor-title">Tree Editor
            <span className="et-editor-hint"> — drag nodes · drag ①② handles for bezier CPs</span>
          </div>

          <div className="et-editor-section">
            <div className="et-editor-label">
              NODE_POS
              <button className="et-editor-copy" onClick={() => doCopy(nodePosJson, 'pos')}>
                {copied === 'pos' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="et-editor-pre">{nodePosJson}</pre>
          </div>

          <div className="et-editor-section">
            <div className="et-editor-label">
              CUSTOM_CP
              <button className="et-editor-copy" onClick={() => doCopy(customCPJson, 'cp')}>
                {copied === 'cp' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="et-editor-pre">{customCPJson}</pre>
          </div>

          <div className="et-editor-bottom-row">
            <button className="et-editor-save" onClick={doSave}>
              {copied === 'saved' ? '✓ Saved!' : copied === 'error' ? '✗ Error' : '💾 Save to file'}
            </button>
            <button className="et-editor-reset" onClick={() => {
              setEditPos(Object.fromEntries(NODES.map(n => [n.id, { ...WORLD[n.id] }])));
              setEditCP(JSON.parse(JSON.stringify(CUSTOM_CP)));
            }}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
