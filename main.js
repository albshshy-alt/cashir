const { app, BrowserWindow, Menu, shell, session, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = !app.isPackaged;
const APP_ORIGIN = 'file://';

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

function checkForUpdates() {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdates().catch(() => {});
}

autoUpdater.on('update-available', async (info) => {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'يتوفر تحديث جديد',
    message: `يتوفر تحديث جديد لنظام كاشير (الإصدار ${info.version})`,
    detail: 'سيتم تنزيل التحديث وتثبيته تلقائيًا ثم إعادة تشغيل التطبيق.',
    buttons: ['تحديث الآن', 'لاحقًا'],
    defaultId: 0,
    cancelId: 1
  });
  if (result.response === 0) autoUpdater.downloadUpdate().catch(() => {});
});

autoUpdater.on('update-downloaded', async () => {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'اكتمل تنزيل التحديث',
    message: 'التحديث جاهز للتثبيت.',
    detail: 'اضغط موافق لإعادة تشغيل التطبيق وتطبيق التحديث.',
    buttons: ['موافق', 'لاحقًا'],
    defaultId: 0,
    cancelId: 1
  });
  if (result.response === 0) autoUpdater.quitAndInstall(false, true);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    title: 'متجر المبيعات',
    backgroundColor: '#f7f8fc',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      devTools: isDev,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_ORIGIN)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('before-input-event', (event, input) => {
    const blocked = input.type === 'keyDown' &&
      (input.key === 'F12' ||
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
  createWindow();
  setTimeout(checkForUpdates, 5000);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
