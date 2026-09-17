const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.github.com/repos/albshshy-alt/cashir/releases/latest';
let win;

function page(message, progress = '') {
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تحديثات تطبيق نظام Cashier</title><style>body{font-family:Arial;background:#101827;color:#fff;display:grid;place-items:center;height:100vh;margin:0}.box{width:520px;padding:34px;border:1px solid #3d4d6b;border-radius:18px;background:#182235;text-align:center}h1{font-size:26px}p{color:#cbd5e1;line-height:1.8}.bar{height:10px;background:#334155;border-radius:8px;overflow:hidden;margin-top:22px}.fill{height:100%;width:${progress || '0%'};background:#3b82f6}</style><div class="box"><h1>تحديثات تطبيق نظام Cashier</h1><p>${message}</p><div class="bar"><div class="fill"></div></div></div></html>`;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Cashier-Updater' } }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (error) { reject(error); } });
    }).on('error', reject);
  });
}

function download(url, destination, onProgress) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Cashier-Updater' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) return download(response.headers.location, destination, onProgress).then(resolve, reject);
      if (response.statusCode !== 200) return reject(new Error(`HTTP ${response.statusCode}`));
      const total = Number(response.headers['content-length']) || 0;
      let received = 0;
      const output = fs.createWriteStream(destination);
      response.on('data', chunk => { received += chunk.length; if (total) onProgress(Math.round(received / total * 100)); });
      response.pipe(output);
      output.on('finish', () => output.close(resolve));
      output.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function run() {
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page('جارٍ البحث عن آخر إصدار آمن...'))}`);
  try {
    const release = await requestJson(API_URL);
    const asset = (release.assets || []).find(item => item.name.endsWith('.exe') && item.name.startsWith('Shop-App-'));
    if (!asset) throw new Error('لم يتم العثور على ملف التحديث');
    const destination = path.join(app.getPath('temp'), asset.name);
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page(`جارٍ تنزيل الإصدار ${release.tag_name}...`, '0%'))}`);
    await download(asset.browser_download_url, destination, percent => {
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page(`جارٍ تنزيل الإصدار ${release.tag_name}... ${percent}%`, `${percent}%`))}`);
    });
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page('اكتمل التنزيل. جارٍ تشغيل التثبيت...','100%'))}`);
    spawn(destination, [], { detached: true, stdio: 'ignore' }).unref();
    setTimeout(() => app.quit(), 1200);
  } catch (error) {
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page(`تعذر إكمال التحديث: ${error.message}. أغلق النافذة وحاول مرة أخرى.`))}`);
  }
}

app.whenReady().then(() => {
  win = new BrowserWindow({ width: 660, height: 430, resizable: false, autoHideMenuBar: true, title: 'تحديثات تطبيق نظام Cashier', webPreferences: { contextIsolation: true, nodeIntegration: false, devTools: false } });
  win.on('closed', () => { win = null; });
  run();
});
app.on('window-all-closed', () => app.quit());
