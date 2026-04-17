const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, protocol } = require('electron');
const path = require('path');
const fs   = require('fs');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
};

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

  const applySize = (w, h) => {
    // Must be resizable before setSize — on Windows setSize silently fails
    // on a non-resizable window.
    win.setResizable(true);
    win.setSize(w, h);
    win.setResizable(false);
    win.center();
  };

  if (mode === 'fullscreen') {
    win.setResizable(true);
    win.setFullScreen(true);
  } else if (mode === 'windowed720p') {
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => setTimeout(() => applySize(1280, 720), 150));
      win.setFullScreen(false);
    } else {
      applySize(1280, 720);
    }
  } else if (mode === 'mobile') {
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => setTimeout(() => applySize(420, 860), 150));
      win.setFullScreen(false);
    } else {
      applySize(420, 860);
    }
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
    // Serve dist files via app://localhost/ — reads directly from disk with
    // explicit MIME types so images, fonts, and JS all load correctly.
    const distPath = path.join(__dirname, '../dist');
    protocol.handle('app', (request) => {
      let pathname = new URL(request.url).pathname;
      if (pathname === '/' || pathname === '') pathname = '/index.html';
      const filePath = path.join(distPath, pathname);
      const ext      = path.extname(filePath).toLowerCase();
      const mime     = MIME[ext] || 'application/octet-stream';
      try {
        const data = fs.readFileSync(filePath);
        return new Response(data, { headers: { 'content-type': mime } });
      } catch {
        return new Response('Not found', { status: 404 });
      }
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
