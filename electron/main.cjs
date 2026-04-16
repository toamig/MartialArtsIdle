const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain } = require('electron');
const path = require('path');

// ─── Dev vs. shipping build ──────────────────────────────────────────────────
// `app.isPackaged` is true when running from inside a packaged distribution
// (electron-builder output) and false when running from source. Shipping
// builds disable DevTools entirely — Ctrl+Shift+I, F12, right-click Inspect
// and openDevTools() all become no-ops when devTools is false.
//
// Escape hatch: `MAI_DEV=1` in the environment forces dev mode even on a
// packaged exe, so we can still debug a shipped binary if we have to.
const isDev = !app.isPackaged || process.env.MAI_DEV === '1';

// ─── State ────────────────────────────────────────────────────────────────────

let win  = null;
let tray = null;

// Set by the renderer via IPC — used to decide whether a notification is relevant
let autoFarmActive  = false;

// Prevent spamming notifications: only one per hide session until gains are collected
let notificationFired = false;

// When the window was hidden — used to fire a "reminder" notification after a delay
let hiddenAt = null;

// Fire a reminder notification this long after hiding, if auto-farm is still active
const REMINDER_DELAY_MS = 30 * 60 * 1000; // 30 minutes

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 860,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      // Shipping builds: DevTools fully disabled (Ctrl+Shift+I / F12 no-op).
      // Dev builds: DevTools available and auto-opened below.
      devTools: isDev,
    },
    title: `The Long Road to Heaven${isDev ? ' (DEV)' : ''}`,
    backgroundColor: '#1a1a2e',
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));
  win.setMenuBarVisibility(false);

  // Strip the default application menu on shipping builds so no residual
  // accelerators (DevTools, zoom, etc.) survive behind the hidden menu bar.
  if (!isDev) Menu.setApplicationMenu(null);

  // In dev, pop the inspector open by default so we're debugging from the
  // first frame instead of remembering to hit a shortcut.
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  // Hide to tray instead of quitting when the user clicks X
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
      hiddenAt          = Date.now();
      notificationFired = false;
    }
  });

  // Reset hide state when the player brings the window back
  win.on('show', () => {
    hiddenAt          = null;
    notificationFired = false;
  });
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, '../dist/favicon-32x32.png');
  const icon     = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('The Long Road to Heaven');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => { win.show(); win.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);

  // Left-click brings the window back
  tray.on('click', () => {
    win.show();
    win.focus();
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

function buildNotificationBody(summary) {
  if (!summary) return 'Your disciples have been working hard. Return to collect your spoils.';

  const parts = [];
  if (summary.combat)    parts.push('combat');
  if (summary.gathering) parts.push('gathering');
  if (summary.mining)    parts.push('mining');

  const activity = parts.length
    ? parts.join(', ')
    : 'auto-farm';

  const items = summary.itemCount > 0
    ? ` — ${summary.itemCount.toLocaleString()} items waiting`
    : '';

  return `${activity.charAt(0).toUpperCase() + activity.slice(1)} gains ready${items}. Tap to collect.`;
}

function fireNotification(summary) {
  if (!Notification.isSupported()) return;
  if (notificationFired) return;
  notificationFired = true;

  const n = new Notification({
    title: 'The Long Road to Heaven',
    body:  buildNotificationBody(summary),
    icon:  path.join(__dirname, '../dist/app-icon-1024.png'),
  });

  n.on('click', () => {
    win.show();
    win.focus();
  });

  n.show();
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.on('set-resolution', (_, mode) => {
  if (!win) return;
  if (mode === 'fullscreen') {
    win.setResizable(true);
    win.setFullScreen(true);
  } else if (mode === 'windowed720p') {
    win.setFullScreen(false);
    win.setResizable(false);
    win.setSize(1280, 720);
    win.center();
  } else if (mode === 'mobile') {
    win.setFullScreen(false);
    win.setResizable(false);
    win.setSize(420, 860);
    win.center();
  }
});

// Renderer tells us auto-farm enabled state changed
ipcMain.on('auto-farm-active', (_, active) => {
  autoFarmActive = active;
});

// Renderer tells us gains are waiting — fire a notification if the window is hidden
ipcMain.on('gains-ready', (_, summary) => {
  if (win && !win.isVisible()) {
    fireNotification(summary);
  }
});

// ─── Reminder timer ───────────────────────────────────────────────────────────
// If the player minimises with auto-farm running but never comes back,
// fire a gentle reminder after REMINDER_DELAY_MS.

function startReminderTimer() {
  setInterval(() => {
    if (!autoFarmActive)    return; // nothing farming
    if (!hiddenAt)          return; // window is visible
    if (notificationFired)  return; // already notified this session
    if (win?.isVisible())   return; // window came back

    if (Date.now() - hiddenAt >= REMINDER_DELAY_MS) {
      fireNotification(null); // generic message — no item count available via timer
    }
  }, 60 * 1000); // check every minute
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

// ─── Single instance lock ─────────────────────────────────────────────────────
// If a second instance is launched, focus the existing window instead.

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.focus(); }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    startReminderTimer();
  });
}

// Don't quit when all windows are closed — the tray keeps the app alive
app.on('window-all-closed', () => {
  // Intentionally empty: app stays alive via the tray
});

// macOS: re-open window when clicking the dock icon
app.on('activate', () => {
  if (win) { win.show(); win.focus(); }
});
