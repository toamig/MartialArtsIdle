import { useState } from 'react';
import { exportSave, importSave, wipeSave } from '../systems/save';

function StatsScreen() {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState(null);

  const flash = (text, isError) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const encoded = exportSave();
    if (!encoded) {
      flash('No save data found', true);
      return;
    }
    navigator.clipboard.writeText(encoded).then(
      () => flash('Save copied to clipboard!', false),
      () => {
        // Fallback: show the string
        setImportText(encoded);
        setShowImport(true);
        flash('Copy the text above manually', false);
      }
    );
  };

  const handleImport = () => {
    if (!importText.trim()) {
      flash('Paste your save string first', true);
      return;
    }
    const result = importSave(importText);
    if (result.ok) {
      flash('Save imported! Reloading...', false);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      flash(result.error, true);
    }
  };

  const handleWipe = () => {
    if (window.confirm('Are you sure? This will delete ALL progress!')) {
      wipeSave();
      flash('Save wiped! Reloading...', false);
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="screen stats-screen">
      <h1>Character Stats</h1>
      <p className="subtitle">Your progress</p>
      <div className="stats-list">
        <div className="stat-row">
          <span className="stat-label">Rank</span>
          <span className="stat-value">Novice Disciple</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Strength</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Agility</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Spirit</span>
          <span className="stat-value">1</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Gold</span>
          <span className="stat-value">0</span>
        </div>
      </div>

      <div className="save-section">
        <h2>Save Data</h2>

        {message && (
          <div className={`save-message ${message.isError ? 'save-error' : 'save-success'}`}>
            {message.text}
          </div>
        )}

        <div className="save-buttons">
          <button className="save-btn" onClick={handleExport}>
            Export Save
          </button>
          <button
            className="save-btn"
            onClick={() => setShowImport(!showImport)}
          >
            Import Save
          </button>
          <button className="save-btn save-btn-danger" onClick={handleWipe}>
            Wipe Save
          </button>
        </div>

        {showImport && (
          <div className="import-area">
            <textarea
              className="import-input"
              placeholder="Paste your save string here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={3}
            />
            <button className="save-btn" onClick={handleImport}>
              Load Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsScreen;
