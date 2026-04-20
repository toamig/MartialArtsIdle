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
      { id: 'ui_open',    label: 'Open',    desc: 'Screen or drawer slides open'  },
      { id: 'ui_close',   label: 'Close',   desc: 'Screen or drawer closes'       },
      { id: 'ui_confirm', label: 'Confirm', desc: 'Positive confirm / success'    },
      { id: 'ui_notify',  label: 'Notify',  desc: 'Notification / alert ping'     },
    ],
  },
  {
    label: 'Cultivation',
    items: [
      { id: 'cult_qi_pulse',      label: 'Qi Pulse',       desc: 'Subtle ambient qi pulse while cultivating'    },
      { id: 'cult_breakthrough',  label: 'Breakthrough',   desc: 'Major milestone — realm breakthrough'         },
      { id: 'cult_channel_start', label: 'Channel Start',  desc: 'Heavenly Qi channel begins'                   },
      { id: 'cult_channel_end',   label: 'Channel End',    desc: 'Heavenly Qi channel ends / expires'           },
      { id: 'cult_boost_active',  label: 'Boost Active',   desc: 'Heavenly Qi boost becomes active (ad watched)'},
    ],
  },
  {
    label: 'Combat',
    items: [
      { id: 'combat_hit_player', label: 'Player Hit',   desc: 'Player lands a hit on an enemy'   },
      { id: 'combat_hit_enemy',  label: 'Enemy Hit',    desc: 'Enemy lands a hit on the player'  },
      { id: 'combat_critical',   label: 'Critical',     desc: 'Critical hit — either side'       },
      { id: 'combat_dodge',      label: 'Dodge',        desc: 'Dodge / miss'                     },
      { id: 'combat_technique',  label: 'Technique',    desc: 'Secret technique activated'       },
      { id: 'combat_heal',       label: 'Heal',         desc: 'Heal effect applied'              },
      { id: 'combat_victory',    label: 'Victory',      desc: 'Player wins the fight'            },
      { id: 'combat_defeat',     label: 'Defeat',       desc: 'Player is defeated'               },
      { id: 'combat_enemy_die',  label: 'Enemy Death',  desc: 'Enemy dies mid-wave'              },
    ],
  },
  {
    label: 'Gathering & Mining',
    items: [
      { id: 'gather_collect', label: 'Gather',       desc: 'Herb / material collected (common)' },
      { id: 'gather_rare',    label: 'Gather Rare',  desc: 'Rare item found during gathering'   },
      { id: 'mine_strike',    label: 'Mine Strike',  desc: 'Pickaxe strike during mining'       },
      { id: 'mine_collect',   label: 'Mine Collect', desc: 'Ore collected'                      },
    ],
  },
  {
    label: 'Items & Crafting',
    items: [
      { id: 'item_craft',    label: 'Craft',    desc: 'Item crafted successfully'         },
      { id: 'item_upgrade',  label: 'Upgrade',  desc: 'Quality upgraded'                  },
      { id: 'item_equip',    label: 'Equip',    desc: 'Item equipped'                     },
      { id: 'item_unequip',  label: 'Unequip',  desc: 'Item unequipped'                   },
      { id: 'item_pill_use', label: 'Pill Use', desc: 'Pill consumed'                     },
      { id: 'item_refine',   label: 'Refine',   desc: 'Artefact / technique refined'      },
    ],
  },
];

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MiB

// ── Root editor ───────────────────────────────────────────────────────────────

export default function AudioEditor({ edited, onChangeRecords }) {
  const [activeTab, setActiveTab] = useState('bgm');
  const records = edited.records || {};

  function updateRecord(id, patch) {
    const current = records[id] || {};
    onChangeRecords({ ...records, [id]: { ...current, ...patch } });
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
              soundId={track.id}
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
  return (
    <div className="au-sfx-panel">
      {SFX_GROUPS.map((group) => (
        <details key={group.label} className="au-sfx-group" open>
          <summary className="au-sfx-group-summary">{group.label}</summary>
          <div className="au-sfx-rows">
            {group.items.map((item) => {
              const rec     = records[item.id] || {};
              const vol     = rec.volume ?? 1.0;
              const hasSrc  = Array.isArray(rec.src) && rec.src.length > 0;
              const isDirty = Object.keys(rec).length > 0;

              return (
                <SfxRow
                  key={item.id}
                  item={item}
                  vol={vol}
                  hasSrc={hasSrc}
                  srcPaths={rec.src}
                  isDirty={isDirty}
                  onVolumeChange={(v) => onUpdate(item.id, { volume: v })}
                  onUploaded={(src) => onUpdate(item.id, { src })}
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

function SfxRow({ item, vol, hasSrc, srcPaths, isDirty, onVolumeChange, onUploaded, onReset }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`au-sfx-row ${isDirty ? 'au-dirty' : ''}`}>
      <div className="au-sfx-row-main">
        <div className="au-sfx-row-info">
          <span className="au-sound-label">{item.label}</span>
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
            {expanded ? 'Cancel' : 'Upload'}
          </button>

          {isDirty && (
            <button className="dz-btn dz-btn-ghost" onClick={onReset}>Reset</button>
          )}
        </div>
      </div>

      {(hasSrc || expanded) && (
        <div className="au-sfx-row-extra">
          {hasSrc && (
            <div className="au-src-list">
              {srcPaths.map((s) => (
                <code key={s} className="au-src-path">{s}</code>
              ))}
            </div>
          )}
          {!hasSrc && expanded && (
            <div className="au-src-list">
              <code className="au-src-path au-src-default">/audio/sfx/{item.id}.ogg</code>
              <code className="au-src-path au-src-default">/audio/sfx/{item.id}.mp3</code>
            </div>
          )}
          {expanded && (
            <AudioUploadRow
              soundId={item.id}
              folder="sfx"
              onUploaded={(src) => { onUploaded(src); setExpanded(false); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Audio upload row ──────────────────────────────────────────────────────────

/**
 * Upload a .ogg and/or .mp3 for a single sound.
 * Commits directly via the GitHub API (same as SpriteUpload).
 * Calls onUploaded([oggPath, mp3Path]) with whatever was successfully uploaded.
 */
const WAV_BGM_WARNING_MB = 4; // warn if a WAV uploaded for BGM exceeds this

function AudioUploadRow({ soundId, folder, onUploaded }) {
  const [oggFile, setOggFile] = useState(null);
  const [mp3File, setMp3File] = useState(null);
  const [wavFile, setWavFile] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null);
  const oggRef = useRef(null);
  const mp3Ref = useRef(null);
  const wavRef = useRef(null);

  const basePath = `public/audio/${folder}/${soundId}`;

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
    setMsg({ type: 'info', text: `Uploading ${soundId}.${ext}…` });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const res = await putBinaryFile(loadPat(), {
      path:    `${basePath}.${ext}`,
      bytes,
      message: `design: audio — upload ${folder}/${soundId}.${ext}`,
    });
    if (!res.ok) throw new Error(uploadError(label, res));
    // Store as a BASE-relative path so it works on any deployment base URL.
    return `audio/${folder}/${soundId}.${ext}`;
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
