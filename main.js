const { app, BrowserWindow, Menu, shell, session, ipcMain, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');

const isDev = !app.isPackaged;
const APP_ORIGIN = 'file://';
const SECURE_STORE_FILE = path.join(app.getPath('userData'), 'cashier-secure-store.json');
const GITHUB_LATEST_API = 'https://api.github.com/repos/albshshy-alt/cashir/releases/latest';
const UPDATER_RELEASE_URL = 'https://github.com/albshshy-alt/cashir/releases/latest/download/Update-Cashier-win-x64.exe';

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
let mainWindow;

function readSecureStore() {
  try {
    if (!safeStorage.isEncryptionAvailable() || !fs.existsSync(SECURE_STORE_FILE)) return {};
    const encrypted = JSON.parse(fs.readFileSync(SECURE_STORE_FILE, 'utf8'));
    return Object.fromEntries(Object.entries(encrypted).map(([key, value]) => [key, safeStorage.decryptString(Buffer.from(value, 'base64'))]));
  } catch { return {}; }
}

function writeSecureStore(values) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows data protection is unavailable');
  const encrypted = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, safeStorage.encryptString(String(value)).toString('base64')]));
  fs.mkdirSync(path.dirname(SECURE_STORE_FILE), { recursive: true });
  fs.writeFileSync(SECURE_STORE_FILE, JSON.stringify(encrypted), { mode: 0o600 });
}

function versionParts(version) { return String(version).replace(/^v/, '').split('.').map(n => Number(n) || 0); }
function isNewerVersion(remote, local) {
  const a = versionParts(remote), b = versionParts(local);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
}

function checkMandatoryUpdate() {
  if (!app.isPackaged) return;
  const request = https.get(GITHUB_LATEST_API, { headers: { 'User-Agent': 'Cashier-App-Updater' } }, response => {
    let body = '';
    response.on('data', chunk => { body += chunk; });
    response.on('end', () => {
      try {
        const latest = JSON.parse(body).tag_name;
        if (latest && isNewerVersion(latest, app.getVersion())) {
          mainWindow?.webContents.send('updater:required', { version: latest, updaterUrl: UPDATER_RELEASE_URL });
        }
      } catch {}
    });
  });
  request.on('error', () => {});
}

function checkForUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdates().catch(() => {});
}

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('updater:available', { version: info.version });
});
autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('updater:progress', { percent: progress.percent });
});
autoUpdater.on('update-downloaded', () => mainWindow?.webContents.send('updater:downloaded'));
autoUpdater.on('error', (error) => mainWindow?.webContents.send('updater:error', error.message));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 680,
    title: 'نظام كاشير', backgroundColor: '#f7f8fc', autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true,
      devTools: isDev, webSecurity: true, allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow = win;
  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(APP_ORIGIN)) event.preventDefault(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (event, input) => {
    const blocked = input.type === 'keyDown' && (input.key === 'F12' ||
      (input.control && input.shift && ['I', 'J', 'C'].includes(input.key.toUpperCase())) ||
      (input.meta && input.alt && input.key.toUpperCase() === 'I'));
    if (blocked) event.preventDefault();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['file://*/*'] }, (details, callback) => {
    callback({ cancel: !details.url.startsWith(APP_ORIGIN) });
  });
  ipcMain.on('updater:check', () => checkForUpdates());
  ipcMain.on('updater:download', () => autoUpdater.downloadUpdate().catch(() => {}));
  ipcMain.on('updater:install', () => autoUpdater.quitAndInstall(false, true));
  ipcMain.on('updater:open-external', (_event, url) => {
    if (url === UPDATER_RELEASE_URL) shell.openExternal(url);
  });
  ipcMain.handle('secure-storage:load', () => readSecureStore());
  ipcMain.handle('secure-storage:save', (_event, values) => { writeSecureStore(values); return true; });
  createWindow();
  setTimeout(checkForUpdates, 5000);
  setTimeout(checkMandatoryUpdate, 2500);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
