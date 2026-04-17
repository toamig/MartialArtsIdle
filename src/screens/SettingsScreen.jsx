import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportSave, importSave, wipeSave } from '../systems/save';
import { setLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { loadGraphics, applyGraphics, saveGraphics } from '../systems/graphics';

const RENDERING_MODES = [
  { mode: 'auto',       label: 'Auto',       sub: 'smooth' },
  { mode: 'pixelated',  label: 'Pixelated',  sub: 'crisp' },
];

const RESOLUTIONS = [
  { mode: 'mobile',       label: 'Mobile',        sub: '420 × 860' },
  { mode: 'windowed720p', label: 'Windowed 720p',  sub: '1280 × 720' },
  { mode: 'fullscreen',   label: 'Fullscreen',     sub: 'native' },
];

function SettingsScreen() {
  const { t, i18n } = useTranslation('ui');

  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState('');
  const [message,     setMessage]     = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const isDesktop = !!window.electronBridge?.setResolution;
  const [resolution, setResolutionState] = useState(
    () => localStorage.getItem('resolution') ?? 'mobile'
  );

  const applyResolution = (mode) => {
    localStorage.setItem('resolution', mode);
    setResolutionState(mode);
    window.electronBridge.setResolution(mode);
  };

  const [graphics, setGraphicsState] = useState(loadGraphics);

  const setGraphics = (next) => {
    setGraphicsState(next);
    saveGraphics(next);
    applyGraphics(next);
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

  const handleWipe = () => setConfirmWipe(true);

  const confirmDoWipe = () => {
    setConfirmWipe(false);
    wipeSave();
    window.location.reload();
  };

  return (
    <div className="screen">
      <h1>{t('settings.title')}</h1>
      <p className="subtitle">{t('settings.subtitle')}</p>

      {isDesktop && (
        <div className="save-section">
          <h2>Graphics</h2>
          <p className="subtitle">Window resolution — takes effect immediately.</p>
          <div className="save-buttons">
            {RESOLUTIONS.map(({ mode, label, sub }) => (
              <button
                key={mode}
                className={`save-btn${resolution === mode ? ' save-btn-active' : ''}`}
                onClick={() => applyResolution(mode)}
              >
                <span>{label}</span>
                <span className="res-sub">{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="save-section">
        <h2>Visual Effects</h2>
        <p className="subtitle">Particle effects and animations.</p>
        <div className="save-buttons">
          <button
            className={`save-btn${graphics.vfxEnabled ? ' save-btn-active' : ''}`}
            onClick={() => setGraphics({ ...graphics, vfxEnabled: true })}
          >
            <span>On</span>
          </button>
          <button
            className={`save-btn${!graphics.vfxEnabled ? ' save-btn-active' : ''}`}
            onClick={() => setGraphics({ ...graphics, vfxEnabled: false })}
          >
            <span>Off</span>
          </button>
        </div>
      </div>

      <div className="save-section">
        <h2>Rendering Mode</h2>
        <p className="subtitle">How images are scaled.</p>
        <div className="save-buttons">
          {RENDERING_MODES.map(({ mode, label, sub }) => (
            <button
              key={mode}
              className={`save-btn${graphics.renderingMode === mode ? ' save-btn-active' : ''}`}
              onClick={() => setGraphics({ ...graphics, renderingMode: mode })}
            >
              <span>{label}</span>
              <span className="res-sub">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="save-section">
        <h2>{t('settings.language')}</h2>
        <p className="subtitle">{t('settings.languageSubtitle')}</p>
        <div className="save-buttons">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`save-btn${i18n.language === lang.code ? ' save-btn-active' : ''}`}
              onClick={() => setLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="save-section">
        <h2>{t('settings.saveData')}</h2>

        {message && (
          <div className={`save-message ${message.isError ? 'save-error' : 'save-success'}`}>
            {message.text}
          </div>
        )}

        <div className="save-buttons">
          <button className="save-btn" onClick={handleExport}>{t('settings.exportSave')}</button>
          <button className="save-btn" onClick={() => setShowImport(!showImport)}>{t('settings.importSave')}</button>
          {confirmWipe ? (
            <div className="wipe-confirm">
              <span className="wipe-confirm-label">{t('settings.areYouSure')}</span>
              <button className="save-btn save-btn-danger" onClick={confirmDoWipe}>{t('settings.yesWipe')}</button>
              <button className="save-btn" onClick={() => setConfirmWipe(false)}>{t('common.cancel')}</button>
            </div>
          ) : (
            <button className="save-btn save-btn-danger" onClick={handleWipe}>{t('settings.wipeSave')}</button>
          )}
        </div>

        {showImport && (
          <div className="import-area">
            <textarea
              className="import-input"
              placeholder={t('settings.pastePlaceholder')}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
            />
            <button className="save-btn" onClick={handleImport}>{t('settings.loadSave')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsScreen;
