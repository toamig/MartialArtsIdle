// @refresh reset
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportSave, importSave, wipeSave } from '../systems/save';
import { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { loadGraphics, applyGraphics, saveGraphics } from '../systems/graphics';
import useAudio from '../audio/useAudio';
import { trackSettingChanged } from '../analytics';
import {
  RESOLUTIONS,
  getResolution,
  saveResolution,
  applyResolution,
  isResolutionSelectorAvailable,
} from '../systems/desktopResolution';

const RENDERING_MODES = [
  { mode: 'auto',      label: 'Smooth',    sub: 'bilinear',  icon: '〜' },
  { mode: 'pixelated', label: 'Crisp',     sub: 'pixelated', icon: '▦' },
];

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="stg-segment">
      {options.map(o => (
        <button
          key={o.value}
          className={`stg-segment-btn${value === o.value ? ' stg-segment-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OptionGrid({ options, value, onChange }) {
  return (
    <div className="stg-option-grid">
      {options.map(o => (
        <button
          key={o.mode}
          className={`stg-option-card${value === o.mode ? ' stg-option-active' : ''}`}
          onClick={() => onChange(o.mode)}
        >
          {o.icon && <span className="stg-option-icon">{o.icon}</span>}
          <span className="stg-option-label">{o.label}</span>
          <span className="stg-option-sub">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

function ActionRow({ icon, label, sublabel, onClick, danger, disabled }) {
  return (
    <button
      className={`stg-action-row${danger ? ' stg-action-danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="stg-action-icon">{icon}</span>
      <span className="stg-action-body">
        <span className="stg-action-label">{label}</span>
        {sublabel && <span className="stg-action-sub">{sublabel}</span>}
      </span>
      <span className="stg-action-chevron">›</span>
    </button>
  );
}

const AUDIO_CHANNELS = [
  { channel: 'master', label: 'Master', volKey: 'masterVol', muteKey: 'masterMuted' },
  { channel: 'bgm',    label: 'Music',  volKey: 'bgmVol',    muteKey: 'bgmMuted'    },
  { channel: 'sfx',    label: 'Effects',volKey: 'sfxVol',    muteKey: 'sfxMuted'    },
];

function SettingsScreen({ onClose }) {
  const { t, i18n } = useTranslation('ui');
  const audio = useAudio();

  // Local slider state — separate from audio.settings so the slider doesn't
  // snap back while dragging (controlled inputs fight with async state updates).
  const [sliderVols, setSliderVols] = useState(() => ({
    master: audio.settings.masterVol,
    bgm:    audio.settings.bgmVol,
    sfx:    audio.settings.sfxVol,
  }));

  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState('');
  const [message,     setMessage]     = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Show the resolution selector on any desktop runtime: Steam (Electron),
  // Google Play Games for PC, or a desktop browser. See platform.js.
  const isDesktop = isResolutionSelectorAvailable();
  const [resolution, setResolutionState] = useState(getResolution);

  const handleResolutionChange = (mode) => {
    saveResolution(mode);
    setResolutionState(mode);
    applyResolution(mode);
    try { trackSettingChanged('resolution', mode); } catch {}
  };

  const [graphics, setGraphicsState] = useState(loadGraphics);
  const setGraphics = (next) => {
    setGraphicsState(next);
    saveGraphics(next);
    applyGraphics(next);
    try { trackSettingChanged('graphics', next?.preset ?? next?.quality ?? 'custom'); } catch {}
  };

  const flash = (text, isError) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const encoded = exportSave();
    if (!encoded) { flash(t('settings.noSaveFound'), true); return; }
    navigator.clipboard.writeText(encoded).then(
      () => flash(t('settings.copiedToClipboard'), false),
      () => { setImportText(encoded); setShowImport(true); flash(t('settings.copyManually'), false); }
    );
  };

  const handleImport = () => {
    if (!importText.trim()) { flash(t('settings.pasteSaveFirst'), true); return; }
    const result = importSave(importText);
    if (result.ok) {
      flash(t('settings.saveImported'), false);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      flash(result.error, true);
    }
  };

  const confirmDoWipe = () => {
    setConfirmWipe(false);
    wipeSave();
    window.location.reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="stg-header">
          <div className="stg-title">
            <span className="stg-title-icon">⚙</span>
            {t('settings.title')}
          </div>
          <button className="journey-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="settings-modal-body">

          {/* Audio */}
          <div className="stg-section">
            <div className="stg-section-label">Audio</div>
            {AUDIO_CHANNELS.map(({ channel, label, muteKey }) => {
              const muted   = audio.settings[muteKey];
              const localVol = sliderVols[channel];
              return (
                <div key={channel} className="stg-audio-row">
                  <span className="stg-audio-label">{label}</span>
                  <input
                    type="range"
                    className={`stg-audio-slider${muted ? ' stg-audio-slider-muted' : ''}`}
                    min="0" max="1" step="0.01"
                    value={localVol}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setSliderVols(prev => ({ ...prev, [channel]: val }));
                    }}
                    onMouseUp={e  => audio.setVolume(channel, parseFloat(e.target.value))}
                    onTouchEnd={e => audio.setVolume(channel, parseFloat(e.target.value))}
                    disabled={muted}
                    aria-label={`${label} volume`}
                  />
                  <span className="stg-audio-pct">{muted ? '—' : `${Math.round(localVol * 100)}%`}</span>
                  <button
                    className={`stg-audio-mute${muted ? ' stg-audio-muted' : ''}`}
                    onClick={() => audio.setMuted(channel, !muted)}
                    aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
                  >
                    {muted ? '🔇' : '🔊'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Visual effects */}
          <div className="stg-section">
            <div className="stg-section-label">Visual Effects</div>
            <div className="stg-row">
              <div className="stg-row-info">
                <span className="stg-row-title">Particles &amp; Animations</span>
              </div>
              <SegmentedControl
                options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]}
                value={graphics.vfxEnabled}
                onChange={v => setGraphics({ ...graphics, vfxEnabled: v })}
              />
            </div>
          </div>

          {/* Rendering mode */}
          <div className="stg-section">
            <div className="stg-section-label">Rendering Mode</div>
            <OptionGrid
              options={RENDERING_MODES}
              value={graphics.renderingMode}
              onChange={mode => setGraphics({ ...graphics, renderingMode: mode })}
            />
          </div>

          {/* Resolution — desktop only */}
          {isDesktop && (
            <div className="stg-section">
              <div className="stg-section-label">Window Resolution</div>
              <OptionGrid
                options={RESOLUTIONS}
                value={resolution}
                onChange={handleResolutionChange}
              />
            </div>
          )}

          {/* Language */}
          <div className="stg-section">
            <div className="stg-section-label">{t('settings.language')}</div>
            <div className="stg-lang-row">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={`stg-lang-btn${i18n.language === lang.code ? ' stg-lang-active' : ''}`}
                  onClick={() => { setLanguage(lang.code); try { trackSettingChanged('language', lang.code); } catch {} }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save data */}
          <div className="stg-section">
            <div className="stg-section-label">{t('settings.saveData')}</div>

            {message && (
              <div className={`stg-flash ${message.isError ? 'stg-flash-error' : 'stg-flash-ok'}`}>
                {message.text}
              </div>
            )}

            <div className="stg-action-list">
              <ActionRow
                icon="📤"
                label={t('settings.exportSave')}
                sublabel="Copy save code to clipboard"
                onClick={handleExport}
              />
              <ActionRow
                icon="📥"
                label={t('settings.importSave')}
                sublabel="Paste a save code to restore"
                onClick={() => setShowImport(v => !v)}
              />
            </div>

            {showImport && (
              <div className="stg-import-area">
                <textarea
                  className="stg-import-input"
                  placeholder={t('settings.pastePlaceholder')}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  rows={3}
                />
                <button className="stg-import-btn" onClick={handleImport}>
                  {t('settings.loadSave')}
                </button>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="stg-section stg-section-last">
            <div className="stg-section-label stg-label-danger">Danger Zone</div>
            <div className="stg-action-list">
              {confirmWipe ? (
                <div className="stg-wipe-confirm">
                  <span className="stg-wipe-label">{t('settings.areYouSure')}</span>
                  <div className="stg-wipe-btns">
                    <button className="stg-wipe-yes" onClick={confirmDoWipe}>{t('settings.yesWipe')}</button>
                    <button className="stg-wipe-cancel" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</button>
                  </div>
                </div>
              ) : (
                <ActionRow
                  icon="🗑"
                  label={t('settings.wipeSave')}
                  sublabel="Permanently delete all progress"
                  onClick={() => setConfirmWipe(true)}
                  danger
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
