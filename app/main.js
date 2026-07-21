const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

// Dev: app/../data  |  Packaged: sibling "data" folder if it already exists (Colm's OneDrive
// repo copy), else Documents/Electron App Data/Timeline/data for everyone else's install.
// xattr -cr in build script prevents macOS App Translocation so this path stays correct
const SIBLING_DATA = path.join(process.resourcesPath, '..', '..', '..', 'data');
const SHARED_APP_DATA = path.join(app.getPath('documents'), 'Electron App Data', 'Timeline', 'data');
const DATA_DIR  = !app.isPackaged
  ? path.join(__dirname, '..', 'data')
  : fs.existsSync(SIBLING_DATA) ? SIBLING_DATA : SHARED_APP_DATA;
const DATA_FILE   = path.join(DATA_DIR, 'timeline-data.json');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');

let mainWindow = null;
let isDirty    = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1600,
    height: 720,
    minWidth:  1100,
    minHeight: 500,
    title: 'Timeline',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 9 },
    vibrancy: 'under-window',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('timeline.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', e => {
    // No unsaved changes — let the close proceed normally
    if (!isDirty) return;

    // Block the close and show a synchronous native dialog
    e.preventDefault();

    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'You have unsaved changes',
      detail: 'Do you want to save your timeline before closing?',
    });

    if (response === 0) {
      // Tell renderer to save, it will call save-complete when done
      mainWindow.webContents.send('save-and-quit');
    } else if (response === 1) {
      // destroy() bypasses the close event so we don't loop back through this handler
      mainWindow.destroy();
    }
    // 2 = Cancel: do nothing, window stays open
  });
}

app.whenReady().then(() => {
  // Ensure data/ archive/ and team/ folders exist on first launch
  [DATA_DIR, ARCHIVE_DIR, path.join(DATA_DIR, '..', 'team')].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());

// Renderer tells us whether there are unsaved changes
ipcMain.on('set-dirty', (e, dirty) => { isDirty = dirty; });

// Renderer finished saving — now quit
ipcMain.on('save-complete', () => app.quit());

// ── File picker ──
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Timeline Data',
    defaultPath: DATA_DIR,
    filters: [{ name: 'Timeline Data', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  try { return JSON.parse(fs.readFileSync(filePaths[0], 'utf8')); }
  catch(e) { return null; }
});

// ── Project list ──
ipcMain.handle('get-data-dir', () => DATA_DIR);

ipcMain.handle('list-projects', () => {
  try {
    const active = fs.existsSync(DATA_DIR)
      ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
          .map(f => ({ label: f.replace('.json', '').replace(/-/g, ' '), file: f, archived: false }))
      : [];
    const archived = fs.existsSync(ARCHIVE_DIR)
      ? fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'))
          .map(f => ({ label: f.replace('.json', '').replace(/-/g, ' '), file: f, archived: true }))
      : [];
    return [...active, ...archived];
  } catch(e) {
    console.error('list-projects error:', e.message, '\nDATA_DIR:', DATA_DIR);
    return { error: e.message, dataDir: DATA_DIR };
  }
});

const SIBLING_TEAM = path.join(process.resourcesPath, '..', '..', '..', 'team');
const SHARED_TEAM_DATA = path.join(app.getPath('documents'), 'Electron App Data', 'Timeline', 'team');
const TEAM_DIR = !app.isPackaged
  ? path.join(__dirname, '..', 'team')
  : fs.existsSync(SIBLING_TEAM) ? SIBLING_TEAM : SHARED_TEAM_DATA;

ipcMain.handle('list-teams', () => {
  try {
    if (!fs.existsSync(TEAM_DIR)) return [];
    return fs.readdirSync(TEAM_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ file: f, label: f.replace('.json','').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()) }));
  } catch(e) { return []; }
});

ipcMain.handle('load-team', (e, file) => {
  try {
    const p = path.join(TEAM_DIR, file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
  } catch(e) { return []; }
});

ipcMain.handle('save-team', (e, file, members) => {
  try {
    if (!fs.existsSync(TEAM_DIR)) fs.mkdirSync(TEAM_DIR, { recursive: true });
    fs.writeFileSync(path.join(TEAM_DIR, file), JSON.stringify(members, null, 2));
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('archive-project', (e, file) => {
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.renameSync(path.join(DATA_DIR, file), path.join(ARCHIVE_DIR, file));
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('unarchive-project', (e, file) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.renameSync(path.join(ARCHIVE_DIR, file), path.join(DATA_DIR, file));
    return true;
  } catch(e) { return false; }
});

ipcMain.handle('load-project', (e, file, archived) => {
  try {
    const p = path.join(archived ? ARCHIVE_DIR : DATA_DIR, file);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
  } catch(e) { return null; }
});

ipcMain.handle('save-project', (e, file, data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch(e) { return false; }
});

// ── Export: cropped image + text report ──
ipcMain.handle('export-pdf', async (e, rect, projectLabel, reportHtml, filename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Timeline as PDF',
    defaultPath: filename || 'timeline-export.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return null;

  // Capture just the content rows (cropped)
  const image = await mainWindow.webContents.capturePage(rect);
  const pngBase64 = image.toPNG().toString('base64');

  const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; background: #fff; }
  .page { padding: 24px 32px 32px; }
  .timeline-img { width: 100%; display: block; border: 1px solid #ddd; margin-bottom: 28px; }
  h1 { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
  @media print { @page { size: A3 landscape; margin: 12mm; } }
</style>
</head><body>
<div class="page">
  <img class="timeline-img" src="data:image/png;base64,${pngBase64}">
  ${reportHtml}
</div>
</body></html>`;

  const tmpFile = path.join(app.getPath('temp'), '_timeline_print.html');
  fs.writeFileSync(tmpFile, fullHtml, 'utf8');

  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  await win.loadFile(tmpFile);
  const pdf = await win.webContents.printToPDF({
    landscape: true,
    pageSize: 'A3',
    printBackground: true,
  });
  win.destroy();
  try { fs.unlinkSync(tmpFile); } catch(_) {}

  fs.writeFileSync(filePath, pdf);
  return true;
});

// ── Legacy export (kept for any older callers) ──
ipcMain.handle('capture-page', async (e, filename) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Timeline as PDF',
    defaultPath: filename || 'timeline-export.pdf',
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return false;
  const pdf = await mainWindow.webContents.printToPDF({ landscape: true, pageSize: 'A3', printBackground: true });
  fs.writeFileSync(filePath, pdf);
  return true;
});

// ── Legacy file I/O (keep for save-and-quit path) ──
ipcMain.handle('load-data', () => null);

ipcMain.handle('save-data', (e, data) => {
  // Renderer now calls save-project directly; this is kept for the onSaveAndQuit path
  // and is handled by the renderer forwarding to save-project instead
  return false;
});
