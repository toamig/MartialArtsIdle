/**
 * preload.cjs — Electron preload script.
 *
 * Runs in the renderer context before the page loads, with access to
 * Node/Electron APIs. Exposes a minimal, explicit bridge via contextBridge
 * so the renderer can communicate with the main process without nodeIntegration.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronBridge', {
  /** True when running inside Electron (vs browser/mobile). */
  isElectron: true,

  /**
   * Tell the main process whether any auto-farm activity is currently enabled.
   * Main uses this to decide whether to show a notification after hiding.
   * @param {boolean} active
   */
  setAutoFarmActive: (active) => ipcRenderer.send('auto-farm-active', active),

  /**
   * Tell the main process that gains are waiting to be collected.
   * Main fires a tray notification if the window is currently hidden.
   * @param {{ combat: boolean, gathering: boolean, mining: boolean, itemCount: number }} summary
   */
  notifyGainsReady: (summary) => ipcRenderer.send('gains-ready', summary),
});
