import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadPat, savePat, clearPat } from './pat.js';
import { checkToken, getFile, putTextFile, REPO_OWNER, REPO_NAME, BRANCH } from './github.js';
import WorldsEditor     from './categories/WorldsEditor.jsx';
import EnemiesEditor    from './categories/EnemiesEditor.jsx';
import RealmsEditor     from './categories/RealmsEditor.jsx';
import CraftingEditor   from './categories/CraftingEditor.jsx';
import ItemsEditor      from './categories/ItemsEditor.jsx';
import PillsEditor      from './categories/PillsEditor.jsx';
import LawsEditor       from './categories/LawsEditor.jsx';
import ArtefactsEditor  from './categories/ArtefactsEditor.jsx';
import AffixPoolsEditor from './categories/AffixPoolsEditor.jsx';
import MaterialsEditor  from './categories/MaterialsEditor.jsx';
import './designer.css';

const EDITORS = {
  worlds:     WorldsEditor,
  enemies:    EnemiesEditor,
  realms:     RealmsEditor,
  laws:       LawsEditor,
  items:      ItemsEditor,
  materials:  MaterialsEditor,
  pills:      PillsEditor,
  artefacts:  ArtefactsEditor,
  crafting:   CraftingEditor,
  affixPools: AffixPoolsEditor,
};

/*
 * Designer panel root.
 *
 * Loads the four override JSON files from the repo via the GitHub API on
 * mount (falls back to empty overrides if unauthed) and keeps a per-domain
 * dirty map. Commits go one-file-at-a-time so domains don't collide on SHA.
 *
 * Category editors (Worlds, Enemies, Realms, Crafting) are wired in Phase C.
 * This shell is the frame: PAT modal, nav, dirty badges, commit action.
 */

const CATEGORIES = [
  // ── Worlds & Encounters ──────────────────────────────────────────────────
  { id: 'worlds',     label: 'Worlds',      section: 'Worlds & Encounters', path: 'src/data/config/worlds.override.json'     },
  { id: 'enemies',    label: 'Enemies',     section: 'Worlds & Encounters', path: 'src/data/config/enemies.override.json'    },
  // ── Progression ──────────────────────────────────────────────────────────
  { id: 'realms',     label: 'Realms',      section: 'Progression',         path: 'src/data/config/realms.override.json'     },
  { id: 'laws',       label: 'Laws',        section: 'Progression',         path: 'src/data/config/laws.override.json'       },
  // ── Inventory ────────────────────────────────────────────────────────────
  { id: 'items',      label: 'Items',       section: 'Inventory',           path: 'src/data/config/items.override.json'      },
  { id: 'materials',  label: 'Materials',   section: 'Inventory',           path: 'src/data/config/materials.override.json'  },
  { id: 'pills',      label: 'Pills',       section: 'Inventory',           path: 'src/data/config/pills.override.json'      },
  { id: 'artefacts',  label: 'Artefacts',   section: 'Inventory',           path: 'src/data/config/artefacts.override.json'  },
  // ── Crafting ─────────────────────────────────────────────────────────────
  { id: 'crafting',   label: 'Crafting',    section: 'Crafting',            path: 'src/data/config/crafting.override.json'   },
  { id: 'affixPools', label: 'Affix Pools', section: 'Crafting',            path: 'src/data/config/affixPools.override.json' },
];

const EMPTY_OVERRIDE = { version: 1, updatedAt: null, records: {} };

export default function Designer() {
  const [pat, setPat] = useState(loadPat);
  const [tokenStatus, setTokenStatus] = useState({ ok: false, reason: 'untested' });
  const [tokenBusy, setTokenBusy] = useState(false);

  // Per-category state: { [catId]: { baseline, edited, sha, loading, error } }
  const [state, setState] = useState(() => {
    const s = {};
    for (const c of CATEGORIES) {
      s[c.id] = { baseline: EMPTY_OVERRIDE, edited: EMPTY_OVERRIDE, sha: null, loading: false, error: null };
    }
    return s;
  });

  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [settingsOpen, setSettingsOpen] = useState(!pat);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitMsg, setCommitMsg] = useState(null);

  // ── Token check on mount + when PAT changes ────────────────────────────
  useEffect(() => {
    if (!pat) { setTokenStatus({ ok: false, reason: 'empty' }); return; }
    let cancelled = false;
    setTokenBusy(true);
    checkToken(pat).then((res) => {
      if (cancelled) return;
      setTokenStatus(res);
      setTokenBusy(false);
    });
    return () => { cancelled = true; };
  }, [pat]);

  // ── Load all override files when authed ────────────────────────────────
  useEffect(() => {
    if (!tokenStatus.ok) return;
    let cancelled = false;
    for (const cat of CATEGORIES) {
      setState((s) => ({ ...s, [cat.id]: { ...s[cat.id], loading: true, error: null } }));
      getFile(pat, cat.path).then((file) => {
        if (cancelled) return;
        const baseline = file.exists ? JSON.parse(file.content) : EMPTY_OVERRIDE;
        setState((s) => ({
          ...s,
          [cat.id]: { baseline, edited: structuredClone(baseline), sha: file.sha, loading: false, error: null },
        }));
      }).catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, [cat.id]: { ...s[cat.id], loading: false, error: err.message } }));
      });
    }
    return () => { cancelled = true; };
  }, [pat, tokenStatus.ok]);

  // ── Dirty tracking ─────────────────────────────────────────────────────
  const dirtyMap = useMemo(() => {
    const d = {};
    let total = 0;
    for (const cat of CATEGORIES) {
      const s = state[cat.id];
      const baseRecords   = s.baseline.records || {};
      const editedRecords = s.edited.records   || {};
      let n = 0;
      const keys = new Set([...Object.keys(baseRecords), ...Object.keys(editedRecords)]);
      for (const k of keys) {
        if (JSON.stringify(baseRecords[k]) !== JSON.stringify(editedRecords[k])) n++;
      }
      d[cat.id] = n;
      total += n;
    }
    return { perCat: d, total };
  }, [state]);

  // ── Edit handler passed to category editors (Phase C) ──────────────────
  const updateCategoryRecords = useCallback((catId, nextRecords) => {
    setState((s) => ({
      ...s,
      [catId]: {
        ...s[catId],
        edited: {
          ...s[catId].edited,
          records: nextRecords,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }, []);

  const discardAll = useCallback(() => {
    if (!confirm(`Discard all ${dirtyMap.total} unsaved changes?`)) return;
    setState((s) => {
      const next = {};
      for (const cat of CATEGORIES) {
        next[cat.id] = { ...s[cat.id], edited: structuredClone(s[cat.id].baseline) };
      }
      return next;
    });
    setCommitMsg({ type: 'info', text: 'Changes discarded.' });
  }, [dirtyMap.total]);

  // ── Commit flow ────────────────────────────────────────────────────────
  const commitAll = useCallback(async () => {
    if (dirtyMap.total === 0 || !tokenStatus.ok) return;
    setCommitBusy(true);
    setCommitMsg({ type: 'info', text: 'Committing…' });

    const results = [];
    const dirtyCats = CATEGORIES.filter((c) => dirtyMap.perCat[c.id] > 0);

    for (const cat of dirtyCats) {
      const s = state[cat.id];
      const payload = JSON.stringify(s.edited, null, 2) + '\n';
      const count = dirtyMap.perCat[cat.id];
      const message = `design: update ${cat.label.toLowerCase()} — ${count} record${count === 1 ? '' : 's'}`;
      const res = await putTextFile(pat, { path: cat.path, content: payload, sha: s.sha, message });
      results.push({ cat, res });
      if (!res.ok) break; // abort batch on first failure
    }

    const failed = results.find((r) => !r.res.ok);
    if (failed) {
      setCommitBusy(false);
      if (failed.res.conflict) {
        setCommitMsg({
          type: 'error',
          text: `${failed.cat.label}: upstream changed while you were editing. Reload to pull latest (your edits will be lost) or keep editing and retry later.`,
          canReload: true,
        });
      } else {
        setCommitMsg({
          type: 'error',
          text: `${failed.cat.label}: commit failed (${failed.res.status}). ${failed.res.body?.slice(0, 180) ?? ''}`,
        });
      }
      return;
    }

    setCommitBusy(false);
    setCommitMsg({
      type: 'success',
      text: `Committed ${dirtyCats.length} file${dirtyCats.length === 1 ? '' : 's'} to ${REPO_OWNER}/${REPO_NAME}. Reload the game to see changes.`,
    });

    // Update local baselines to reflect what was just committed, clearing dirty.
    setState((s) => {
      const next = { ...s };
      for (const r of results) {
        if (r.res.ok) {
          next[r.cat.id] = {
            ...next[r.cat.id],
            baseline: structuredClone(next[r.cat.id].edited),
            sha: r.res.sha,
          };
        }
      }
      return next;
    });
  }, [dirtyMap, pat, state, tokenStatus.ok]);

  const activeCatState = state[activeCat];

  return (
    <div className="dz-root">
      {/* Header */}
      <header className="dz-header">
        <div className="dz-header-title">
          <span className="dz-logo">◈</span>
          <span>Designer</span>
          <span className="dz-repo">{REPO_OWNER}/{REPO_NAME}@{BRANCH}</span>
        </div>
        <div className="dz-header-actions">
          {tokenStatus.ok && <span className="dz-user">✓ {tokenStatus.login}</span>}
          {!tokenStatus.ok && tokenStatus.reason !== 'untested' && <span className="dz-user dz-user-bad">⚠ {authReasonLabel(tokenStatus.reason)}</span>}
          <button className="dz-btn dz-btn-ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      {/* Body: nav + editor */}
      <div className="dz-body">
        <nav className="dz-nav">
          {(() => {
            const out = [];
            let lastSection = null;
            for (const c of CATEGORIES) {
              if (c.section && c.section !== lastSection) {
                out.push(<div key={`sec-${c.section}`} className="dz-nav-section">{c.section}</div>);
                lastSection = c.section;
              }
              out.push(
                <button
                  key={c.id}
                  className={`dz-nav-item ${activeCat === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  <span>{c.label}</span>
                  {dirtyMap.perCat[c.id] > 0 && (
                    <span className="dz-dirty-pill">{dirtyMap.perCat[c.id]}</span>
                  )}
                </button>
              );
            }
            return out;
          })()}
        </nav>

        <main className="dz-main">
          {activeCatState.loading && <div className="dz-loading">Loading {activeCat}…</div>}
          {activeCatState.error && (
            <div className="dz-error">Failed to load {activeCat}: {activeCatState.error}</div>
          )}
          {!activeCatState.loading && !activeCatState.error && (() => {
            const Editor = EDITORS[activeCat];
            return (
              <Editor
                edited={activeCatState.edited}
                onChangeRecords={(r) => updateCategoryRecords(activeCat, r)}
              />
            );
          })()}
        </main>
      </div>

      {/* Bottom action bar */}
      <footer className="dz-footer">
        <div className="dz-footer-info">
          {commitMsg && (
            <span className={`dz-msg dz-msg-${commitMsg.type}`}>
              {commitMsg.text}
              {commitMsg.canReload && (
                <button className="dz-btn dz-btn-link" onClick={() => location.reload()}>Reload</button>
              )}
            </span>
          )}
          {!commitMsg && (
            <span className="dz-unsaved">{dirtyMap.total} unsaved change{dirtyMap.total === 1 ? '' : 's'}</span>
          )}
        </div>
        <div className="dz-footer-actions">
          <button
            className="dz-btn dz-btn-ghost"
            onClick={discardAll}
            disabled={dirtyMap.total === 0 || commitBusy}
          >Discard all</button>
          <button
            className="dz-btn dz-btn-primary"
            onClick={commitAll}
            disabled={dirtyMap.total === 0 || !tokenStatus.ok || commitBusy}
            title={!tokenStatus.ok ? 'Add a PAT with push access in Settings to commit' : ''}
          >
            {commitBusy ? 'Committing…' : `Commit to ${BRANCH}`}
          </button>
        </div>
      </footer>

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          pat={pat}
          tokenStatus={tokenStatus}
          tokenBusy={tokenBusy}
          onSave={(newPat) => { savePat(newPat); setPat(newPat); }}
          onClear={() => { clearPat(); setPat(''); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Settings modal ────────────────────────────────────────────────────── */

function SettingsModal({ pat, tokenStatus, tokenBusy, onSave, onClear, onClose }) {
  const [draft, setDraft] = useState(pat);
  return (
    <div className="dz-modal-backdrop" onClick={onClose}>
      <div className="dz-modal" onClick={(e) => e.stopPropagation()}>
        <header className="dz-modal-header">
          <h2>Settings</h2>
          <button className="dz-btn dz-btn-ghost" onClick={onClose}>×</button>
        </header>
        <div className="dz-modal-body">
          <label className="dz-field">
            <span className="dz-field-label">GitHub Personal Access Token</span>
            <input
              type="password"
              className="dz-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="github_pat_..."
              spellCheck={false}
              autoComplete="off"
            />
            <span className="dz-field-help">
              Fine-grained PAT with <code>Contents: Read and write</code> on <code>{REPO_OWNER}/{REPO_NAME}</code>.
              Stored in this tab's sessionStorage only — never persisted to disk or shipped.
            </span>
          </label>

          <div className="dz-token-status">
            {tokenBusy && <span className="dz-msg dz-msg-info">Verifying…</span>}
            {!tokenBusy && tokenStatus.ok && (
              <span className="dz-msg dz-msg-success">
                ✓ Authenticated as {tokenStatus.login} · push access to {tokenStatus.repoFullName}
              </span>
            )}
            {!tokenBusy && !tokenStatus.ok && tokenStatus.reason !== 'untested' && tokenStatus.reason !== 'empty' && (
              <span className="dz-msg dz-msg-error">
                {tokenStatus.login ? `Logged in as ${tokenStatus.login}. ` : ''}
                {authReasonDetail(tokenStatus.reason)}
              </span>
            )}
          </div>
        </div>
        <footer className="dz-modal-footer">
          <button className="dz-btn dz-btn-ghost" onClick={onClear}>Forget PAT</button>
          <button
            className="dz-btn dz-btn-primary"
            onClick={() => { onSave(draft); onClose(); }}
          >Save</button>
        </footer>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function authReasonLabel(reason) {
  switch (reason) {
    case 'empty':            return 'No PAT';
    case 'unauthorized':     return 'Bad PAT';
    case 'repo-not-visible': return 'Repo hidden';
    case 'no-push':          return 'No push access';
    case 'network':          return 'Network error';
    default:                 return reason;
  }
}

function authReasonDetail(reason) {
  switch (reason) {
    case 'unauthorized':     return 'Token was rejected by GitHub. Check it was copied correctly.';
    case 'repo-not-visible': return `Token does not grant access to ${REPO_OWNER}/${REPO_NAME}. Regenerate with Contents: Read and write on this repo.`;
    case 'no-push':          return 'Token lacks push access. Regenerate with Contents: Read and write permission.';
    case 'network':          return 'Could not reach api.github.com — check your connection.';
    default:                 return `Unexpected error: ${reason}`;
  }
}
