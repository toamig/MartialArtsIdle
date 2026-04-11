import { useState } from 'react';
import { exportSave, importSave, wipeSave } from '../systems/save';

function SettingsScreen() {
  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState('');
  const [message,     setMessage]     = useState(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const flash = (text, isError) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const encoded = exportSave();
    if (!encoded) { flash('No save data found', true); return; }
    navigator.clipboard.writeText(encoded).then(
      () => flash('Save copied to clipboard!', false),
      () => { setImportText(encoded); setShowImport(true); flash('Copy the text manually', false); }
    );
  };

  const handleImport = () => {
    if (!importText.trim()) { flash('Paste your save string first', true); return; }
    const result = importSave(importText);
    if (result.ok) {
      flash('Save imported! Reloading…', false);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      flash(result.error, true);
    }
  };

  const handleWipe = () => setConfirmWipe(true);

  const confirmDoWipe = () => {
    setConfirmWipe(false);
    wipeSave();
    flash('Save wiped! Reloading…', false);
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="screen">
      <h1>Settings</h1>
      <p className="subtitle">Game configuration</p>

      <div className="save-section">
        <h2>Save Data</h2>

        {message && (
          <div className={`save-message ${message.isError ? 'save-error' : 'save-success'}`}>
            {message.text}
          </div>
        )}

        <div className="save-buttons">
          <button className="save-btn" onClick={handleExport}>Export Save</button>
          <button className="save-btn" onClick={() => setShowImport(!showImport)}>Import Save</button>
          {confirmWipe ? (
            <div className="wipe-confirm">
              <span className="wipe-confirm-label">Are you sure?</span>
              <button className="save-btn save-btn-danger" onClick={confirmDoWipe}>Yes, wipe</button>
              <button className="save-btn" onClick={() => setConfirmWipe(false)}>Cancel</button>
            </div>
          ) : (
            <button className="save-btn save-btn-danger" onClick={handleWipe}>Wipe Save</button>
          )}
        </div>

        {showImport && (
          <div className="import-area">
            <textarea
              className="import-input"
              placeholder="Paste your save string here…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
            />
            <button className="save-btn" onClick={handleImport}>Load Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsScreen;
