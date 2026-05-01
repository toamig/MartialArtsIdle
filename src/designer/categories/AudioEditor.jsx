import { useState, useRef } from 'react';
import { putBinaryFile } from '../github.js';
import { loadPat } from '../pat.js';

// ── Static metadata ───────────────────────────────────────────────────────────

const BGM_META = [
  { id: 'cultivation', label: 'Cultivation',  desc: 'Calm meditative loop — Home screen, default cultivation state', defaultVol: 1.0 },
  { id: 'combat',      label: 'Combat',        desc: 'High-energy loop — active Combat screen',                       defaultVol: 1.0 },
  { id: 'world',       label: 'World',         desc: 'Ambient exploration — Worlds, Gathering, Mining screens',       defaultVol: 1.0 },
  { id: 'menu',        label: 'Menu',          desc: 'Soft ambient — Settings, Inventory, Stats screens',             defaultVol: 0.6 },
];

const SFX_GROUPS = [
  {
    label: 'UI',
    items: [
      { id: 'ui_click',   label: 'Click',   desc: 'Generic button / tap feedback' },
      { id: 'ui_notify',  label: 'Notify',  desc: 'Notification / alert ping'     },
    ],
  },
  {
    label: 'Cultivation',
    items: [
      { id: 'cult_breakthrough',  label: 'Breakthrough',   desc: 'Major milestone — realm breakthrough' },
    ],
  },
  {
    label: 'Combat',
    items: [
      // Hit / dodge / death sounds use 3-variant pools — every trigger picks one
      // at random + applies a small rate jitter to break up repetition.
      { id: 'combat_hit_player', label: 'Player Hit',   desc: 'Player lands a hit on an enemy',     variants: 3 },
      { id: 'combat_hit_enemy',  label: 'Enemy Hit',    desc: 'Enemy lands a hit on the player',    variants: 3 },
      { id: 'combat_critical',   label: 'Critical',     desc: 'Critical hit — either side',         variants: 3 },
      { id: 'combat_dodge',      label: 'Dodge',        desc: 'Dodge / miss',                       variants: 3 },
      { id: 'combat_enemy_die',  label: 'Enemy Death',  desc: 'Enemy dies mid-wave',                variants: 3 },
      { id: 'combat_technique',  label: 'Technique',    desc: 'Secret technique activated'                       },
      { id: 'combat_heal',       label: 'Heal',         desc: 'Heal effect applied'                              },
      { id: 'combat_victory',    label: 'Victory',      desc: 'Player wins the fight'                            },
      { id: 'combat_defeat',     label: 'Defeat',       desc: 'Player is defeated'                               },
    ],
  },
  {
    label: 'Qi Crystal',
    items: [
      { id: 'crystal_tap',       label: 'Crystal Tap',     desc: 'Tap on the crystal to collect the reservoir (Crystal Click spark)' },
      { id: 'crystal_tap_max',   label: 'Crystal Tap Max', desc: 'Tap when the reservoir is at full cap — bigger payoff feel'        },
      { id: 'crystal_evolve',    label: 'Crystal Evolve',  desc: 'Crystal jumps to a new visual tier after a feed'                   },
      { id: 'divine_qi_collect', label: 'Divine Qi',       desc: 'Tap a Divine Qi orb to collect its burst'                          },
    ],
  },
  {
    label: 'Qi Sparks',
    items: [
      { id: 'spark_pattern_tap',   label: 'Pattern Tap',   desc: 'Tap a numbered dot in Pattern Clicking — pitch rises with each note' },
      { id: 'spark_pattern_clear', label: 'Pattern Clear', desc: 'Last dot tapped successfully — full clear payoff'                    },
      { id: 'spark_pattern_miss',  label: 'Pattern Miss',  desc: 'Pattern Clicking failed — wrong dot or window expired'               },
    ],
  },
  {
    label: 'Items & Crafting',
    items: [
      { id: 'item_craft',    label: 'Craft',    desc: 'Pill brewed (per craftPill call)'                              },
      { id: 'item_upgrade',  label: 'Upgrade',  desc: 'Artefact upgrade level applied'                                },
      { id: 'item_equip',    label: 'Equip',    desc: 'Artefact or technique equipped'                                },
      { id: 'item_unequip',  label: 'Unequip',  desc: 'Artefact or technique unequipped'                              },
      { id: 'item_pill_use', label: 'Pill Use', desc: 'Pill consumed (PillDrawer Use button)'                         },
    ],
  },
];

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MiB

// ── Root editor ───────────────────────────────────────────────────────────────

export default function AudioEditor({ edited, onChangeRecords }) {
  const [activeTab, setActiveTab] = useState('bgm');
  const records = edited.records || {};

  function updateRecord(id, patch, replace = false) {
    const current = records[id] || {};
    const next = replace ? patch : { ...current, ...patch };
    onChangeRecords({ ...records, [id]: next });
  }

  function resetRecord(id) {
    const next = { ...records };
    delete next[id];
    onChangeRecords(next);
  }

  return (
    <div className="au-editor">
      <div className="au-tabs">
        <button
          className={`dz-btn ${activeTab === 'bgm' ? 'au-tab-active' : 'dz-btn-ghost'}`}
          onClick={() => setActiveTab('bgm')}
        >
          BGM Tracks
        </button>
        <button
          className={`dz-btn ${activeTab === 'sfx' ? 'au-tab-active' : 'dz-btn-ghost'}`}
          onClick={() => setActiveTab('sfx')}
        >
          Sound Effects
        </button>
      </div>

      {activeTab === 'bgm' && (
        <BgmPanel records={records} onUpdate={updateRecord} onReset={resetRecord} />
      )}
      {activeTab === 'sfx' && (
        <SfxPanel records={records} onUpdate={updateRecord} onReset={resetRecord} />
      )}
    </div>
  );
}

// ── BGM panel ─────────────────────────────────────────────────────────────────

function BgmPanel({ records, onUpdate, onReset }) {
  return (
    <div className="au-bgm-list">
      {BGM_META.map((track) => {
        const recKey  = `bgm_${track.id}`;
        const rec     = records[recKey] || {};
        const vol     = rec.volume ?? track.defaultVol;
        const loop    = rec.loop   ?? true;
        const hasSrc  = Array.isArray(rec.src) && rec.src.length > 0;
        const isDirty = Object.keys(rec).length > 0;

        return (
          <div key={track.id} className={`au-bgm-card ${isDirty ? 'au-dirty' : ''}`}>
            <div className="au-bgm-card-header">
              <div>
                <span className="au-sound-label">{track.label}</span>
                {isDirty && <span className="au-badge-dirty">edited</span>}
              </div>
              <span className="au-sound-desc">{track.desc}</span>
            </div>

            <div className="au-bgm-controls">
              <label className="au-vol-row">
                <span className="au-ctrl-label">Volume</span>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={vol}
                  className="au-slider"
                  onChange={(e) => onUpdate(recKey, { volume: parseFloat(e.target.value) })}
                />
                <span className="au-vol-val">{vol.toFixed(2)}</span>
              </label>

              <label className="au-loop-row">
                <span className="au-ctrl-label">Loop</span>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => onUpdate(recKey, { loop: e.target.checked })}
                />
              </label>
            </div>

            {hasSrc && (
              <div className="au-src-list">
                {rec.src.map((s) => (
                  <code key={s} className="au-src-path">{s}</code>
                ))}
              </div>
            )}
            {!hasSrc && (
              <div className="au-src-list">
                <code className="au-src-path au-src-default">/audio/bgm/{track.id}.ogg</code>
                <code className="au-src-path au-src-default">/audio/bgm/{track.id}.mp3</code>
              </div>
            )}

            <AudioUploadRow
              fileStem={track.id}
              folder="bgm"
              onUploaded={(src) => onUpdate(recKey, { src })}
            />

            {isDirty && (
              <button className="dz-btn dz-btn-ghost au-reset-btn" onClick={() => onReset(recKey)}>
                Reset to defaults
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SFX panel ─────────────────────────────────────────────────────────────────

function SfxPanel({ records, onUpdate, onReset }) {
  // Replace the entire single-src field with a fresh src array (clears variations).
  function setSingleSrc(id, src) {
    const cur = { ...(records[id] || {}) };
    delete cur.variations;
    cur.src = src;
    onUpdate(id, cur, /* replace */ true);
  }

  // Update one variant slot. Pads the variations array to `count` length first
  // so the JSON shape stays stable even if earlier slots are still empty.
  function setVariantSrc(id, count, index, src) {
    const cur = { ...(records[id] || {}) };
    delete cur.src;
    const variations = Array.isArray(cur.variations) ? cur.variations.slice() : [];
    while (variations.length < count) variations.push(null);
    variations[index] = { src };
    cur.variations = variations;
    onUpdate(id, cur, /* replace */ true);
  }

  return (
    <div className="au-sfx-panel">
      {SFX_GROUPS.map((group) => (
        <details key={group.label} className="au-sfx-group" open>
          <summary className="au-sfx-group-summary">{group.label}</summary>
          <div className="au-sfx-rows">
            {group.items.map((item) => {
              const rec     = records[item.id] || {};
              const vol     = rec.volume ?? 1.0;
              const isDirty = Object.keys(rec).length > 0;

              return (
                <SfxRow
                  key={item.id}
                  item={item}
                  rec={rec}
                  vol={vol}
                  isDirty={isDirty}
                  onVolumeChange={(v) => onUpdate(item.id, { volume: v })}
                  onUploadedSingle={(src) => setSingleSrc(item.id, src)}
                  onUploadedVariant={(index, src) => setVariantSrc(item.id, item.variants ?? 1, index, src)}
                  onReset={() => onReset(item.id)}
                />
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

function SfxRow({ item, rec, vol, isDirty, onVolumeChange, onUploadedSingle, onUploadedVariant, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const variantCount = item.variants ?? 1;
  const isVariant    = variantCount > 1;

  // Per-variant uploaded paths (null = empty slot).
  const variationSlots = isVariant
    ? Array.from({ length: variantCount }, (_, i) => rec.variations?.[i]?.src ?? null)
    : null;
  const singleSrc = !isVariant && Array.isArray(rec.src) && rec.src.length > 0 ? rec.src : null;

  return (
    <div className={`au-sfx-row ${isDirty ? 'au-dirty' : ''}`}>
      <div className="au-sfx-row-main">
        <div className="au-sfx-row-info">
          <span className="au-sound-label">{item.label}</span>
          {isVariant && <span className="au-badge-variant">×{variantCount}</span>}
          {isDirty && <span className="au-badge-dirty">edited</span>}
          <span className="au-sound-desc">{item.desc}</span>
        </div>

        <div className="au-sfx-row-controls">
          <label className="au-vol-row">
            <span className="au-ctrl-label">Vol</span>
            <input
              type="range"
              min="0" max="1" step="0.01"
              value={vol}
              className="au-slider au-slider-sm"
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            />
            <span className="au-vol-val">{vol.toFixed(2)}</span>
          </label>

          <button
            className={`dz-btn dz-btn-ghost au-upload-toggle ${expanded ? 'au-upload-toggle-open' : ''}`}
            onClick={() => setExpanded((x) => !x)}
          >
            {expanded ? 'Cancel' : (isVariant ? 'Variations' : 'Upload')}
          </button>

          {isDirty && (
            <button className="dz-btn dz-btn-ghost" onClick={onReset}>Reset</button>
          )}
        </div>
      </div>

      {/* Single-sample mode: one upload row, one src list */}
      {!isVariant && (singleSrc || expanded) && (
        <div className="au-sfx-row-extra">
          {singleSrc && (
            <div className="au-src-list">
              {singleSrc.map((s) => <code key={s} className="au-src-path">{s}</code>)}
            </div>
          )}
          {!singleSrc && expanded && (
            <div className="au-src-list">
              <code className="au-src-path au-src-default">/audio/sfx/{item.id}.ogg</code>
              <code className="au-src-path au-src-default">/audio/sfx/{item.id}.mp3</code>
            </div>
          )}
          {expanded && (
            <AudioUploadRow
              fileStem={item.id}
              folder="sfx"
              onUploaded={(src) => { onUploadedSingle(src); setExpanded(false); }}
            />
          )}
        </div>
      )}

      {/* Variation pool: stack of N upload rows, each with its own slot status */}
      {isVariant && (variationSlots.some(Boolean) || expanded) && (
        <div className="au-sfx-row-extra">
          {variationSlots.map((slotSrc, i) => {
            const stem = `${item.id}_${i + 1}`;
            return (
              <div key={i} className="au-variant-block">
                <div className="au-variant-header">
                  <span className="au-variant-label">Variation {i + 1}</span>
                  {!slotSrc && <span className="au-variant-empty">empty</span>}
                </div>
                {slotSrc && (
                  <div className="au-src-list">
                    {slotSrc.map((s) => <code key={s} className="au-src-path">{s}</code>)}
                  </div>
                )}
                {!slotSrc && expanded && (
                  <div className="au-src-list">
                    <code className="au-src-path au-src-default">/audio/sfx/{stem}.ogg</code>
                    <code className="au-src-path au-src-default">/audio/sfx/{stem}.mp3</code>
                  </div>
                )}
                {expanded && (
                  <AudioUploadRow
                    fileStem={stem}
                    folder="sfx"
                    onUploaded={(src) => onUploadedVariant(i, src)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Audio upload row ──────────────────────────────────────────────────────────

/**
 * Upload a .ogg/.mp3/.wav for a single sound (or one variant of a pool).
 * Commits directly via the GitHub API (same as SpriteUpload).
 * `fileStem` is the basename without extension — e.g. 'ui_click' for a single
 * sample, 'combat_hit_player_2' for variant 2 of a pool.
 * Calls onUploaded([oggPath, mp3Path, wavPath]) with whatever was successfully uploaded.
 */
const WAV_BGM_WARNING_MB = 4; // warn if a WAV uploaded for BGM exceeds this

function AudioUploadRow({ fileStem, folder, onUploaded }) {
  const [oggFile, setOggFile] = useState(null);
  const [mp3File, setMp3File] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null);
  const oggRef = useRef(null);
  const mp3Ref = useRef(null);
  const wavRef = useRef(null);

  const basePath = `public/audio/${folder}/${fileStem}`;

  function pickFile(ext, setter) {
    return (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > MAX_AUDIO_SIZE) {
        setMsg({ type: 'error', text: `${f.name}: too large (${(f.size / (1024*1024)).toFixed(1)} MiB). 10 MiB max.` });
        return;
      }
      if (ext === 'wav' && folder === 'bgm' && f.size > WAV_BGM_WARNING_MB * 1024 * 1024) {
        setMsg({ type: 'error', text: `WAV is uncompressed — this file is ${(f.size / (1024*1024)).toFixed(1)} MiB. Consider converting to OGG or MP3 for BGM; large files slow down loading.` });
        return;
      }
      setter(f);
      setMsg(null);
    };
  }

  function reset() {
    setOggFile(null);
    setMp3File(null);
    setWavFile(null);
    setMsg(null);
    if (oggRef.current) oggRef.current.value = '';
    if (mp3Ref.current) mp3Ref.current.value = '';
    if (wavRef.current) wavRef.current.value = '';
  }

  async function uploadOne(file, ext, label) {
    setMsg({ type: 'info', text: `Uploading ${fileStem}.${ext}…` });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = await putBinaryFile(loadPat(), {
      path:    `${basePath}.${ext}`,
      bytes,
      message: `design: audio — upload ${folder}/${fileStem}.${ext}`,
    });
    if (!res.ok) throw new Error(uploadError(label, res));
    // Store as a BASE-relative path so it works on any deployment base URL.
    return `audio/${folder}/${fileStem}.${ext}`;
  }

  async function upload() {
    const pat = loadPat();
    if (!pat) { setMsg({ type: 'error', text: 'Add a PAT in Settings first.' }); return; }
    if (!oggFile && !mp3File && !wavFile) return;

    setBusy(true);
    const uploaded = [];

    try {
      if (oggFile) uploaded.push(await uploadOne(oggFile, 'ogg', 'OGG'));
      if (mp3File) uploaded.push(await uploadOne(mp3File, 'mp3', 'MP3'));
      if (wavFile) uploaded.push(await uploadOne(wavFile, 'wav', 'WAV'));
    } catch (err) {
      setBusy(false);
      setMsg({ type: 'error', text: err.message });
      return;
    }

    setBusy(false);
    setMsg({ type: 'success', text: `Uploaded: ${uploaded.join(', ')}. Reload the game to hear changes.` });

    // Prefer compressed formats: OGG → MP3 → WAV
    const src = ['ogg', 'mp3', 'wav']
      .map(ext => uploaded.find(p => p.endsWith(`.${ext}`)))
      .filter(Boolean);
    onUploaded(src);
    reset();
  }

  const hasFile = oggFile || mp3File || wavFile;

  return (
    <div className="au-upload-row">
      <div className="au-upload-inputs">
        <label className="au-upload-slot">
          <span className="au-ctrl-label">.ogg</span>
          <input ref={oggRef} type="file" accept=".ogg,audio/ogg" disabled={busy} onChange={pickFile('ogg', setOggFile)} />
          {oggFile && <span className="au-file-name">{oggFile.name} · {(oggFile.size / 1024).toFixed(0)} KB</span>}
        </label>

        <label className="au-upload-slot">
          <span className="au-ctrl-label">.mp3</span>
          <input ref={mp3Ref} type="file" accept=".mp3,audio/mpeg" disabled={busy} onChange={pickFile('mp3', setMp3File)} />
          {mp3File && <span className="au-file-name">{mp3File.name} · {(mp3File.size / 1024).toFixed(0)} KB</span>}
        </label>

        <label className="au-upload-slot">
          <span className="au-ctrl-label">.wav</span>
          <input ref={wavRef} type="file" accept=".wav,audio/wav,audio/x-wav" disabled={busy} onChange={pickFile('wav', setWavFile)} />
          {wavFile && <span className="au-file-name">{wavFile.name} · {(wavFile.size / 1024).toFixed(0)} KB</span>}
        </label>
      </div>

      <div className="au-upload-actions">
        <button className="dz-btn dz-btn-ghost" onClick={reset} disabled={busy || !hasFile}>Clear</button>
        <button className="dz-btn dz-btn-primary" onClick={upload} disabled={busy || !hasFile}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {msg && <div className={`dz-msg dz-msg-${msg.type} au-upload-msg`}>{msg.text}</div>}
    </div>
  );
}

function uploadError(ext, res) {
  if (res.conflict) return `${ext} upload rejected — file may already exist on GitHub. It will be overwritten on retry if you add a SHA; try committing first then re-uploading.`;
  return `${ext} upload failed (HTTP ${res.status}).`;
}
