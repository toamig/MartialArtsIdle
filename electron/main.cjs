const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Register app:// as a privileged scheme BEFORE the app is ready.
// Serves the dist folder without hitting file:// sandbox restrictions that
// block portable exes loading from their temp extraction directory.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } },
]);

// ─── Dev vs. shipping build ──────────────────────────────────────────────────
const isDev = !app.isPackaged || process.env.MAI_DEV === '1';

// ─── State ────────────────────────────────────────────────────────────────────

let win  = null;
let tray = null;

let autoFarmActive  = false;
let notificationFired = false;
let hiddenAt = null;

const REMINDER_DELAY_MS = 30 * 60 * 1000;

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
      devTools: isDev,
    },
    title: `The Long Road to Heaven${isDev ? ' (DEV)' : ''}`,
    backgroundColor: '#1a1a2e',
  });

  win.loadURL('app://localhost/index.html');
  win.setMenuBarVisibility(false);

  if (!isDev) Menu.setApplicationMenu(null);
  if (isDev)  win.webContents.openDevTools({ mode: 'bottom' });

  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
      hiddenAt          = Date.now();
      notificationFired = false;
    }
  });

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

  const activity = parts.length ? parts.join(', ') : 'auto-farm';
  const items    = summary.itemCount > 0 ? ` — ${summary.itemCount.toLocaleString()} items waiting` : '';

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

  n.on('click', () => { win.show(); win.focus(); });
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

ipcMain.on('auto-farm-active', (_, active) => {
  autoFarmActive = active;
});

ipcMain.on('gains-ready', (_, summary) => {
  if (win && !win.isVisible()) fireNotification(summary);
});

// ─── Reminder timer ───────────────────────────────────────────────────────────

function startReminderTimer() {
  setInterval(() => {
    if (!autoFarmActive)   return;
    if (!hiddenAt)         return;
    if (notificationFired) return;
    if (win?.isVisible())  return;
    if (Date.now() - hiddenAt >= REMINDER_DELAY_MS) fireNotification(null);
  }, 60 * 1000);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.focus(); }
  });

  app.whenReady().then(() => {
    // Register protocol handler — must be done after app is ready
    const distPath = path.join(__dirname, '../dist');
    protocol.handle('app', (request) => {
      const filePath = path.join(distPath, new URL(request.url).pathname);
      return net.fetch(pathToFileURL(filePath).href);
    });

    createWindow();
    createTray();
    startReminderTimer();
  });
}

app.on('window-all-closed', () => {
  // Intentionally empty: app stays alive via the tray
});

app.on('activate', () => {
  if (win) { win.show(); win.focus(); }
});
