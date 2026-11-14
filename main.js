const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

let mainWindow;
let decompileRunning = false;

function findOnPath(names) {
  const dirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : [''];

  for (const dir of dirs) {
    for (const name of names) {
      const candidates = process.platform === 'win32' && !path.extname(name)
        ? extensions.map((extension) => path.join(dir, `${name}${extension}`))
        : [path.join(dir, name)];
      for (const candidate of candidates) {
        try {
          fs.accessSync(candidate, fs.constants.X_OK);
          return candidate;
        } catch { /* Continue searching. */ }
      }
    }
  }
  return null;
}

function detectTools() {
  return {
    java: findOnPath(['java']),
    jadx: findOnPath(['jadx']),
    apktool: findOnPath(['apktool'])
  };
}

function sendLog(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('decompile:log', message);
  }
}

function runTool(executable, args, label) {
  return new Promise((resolve, reject) => {
    sendLog(`\n--- ${label} ---\n$ ${executable} ${args.map(quoteForLog).join(' ')}\n`);
    const child = spawn(executable, args, { windowsHide: true });
    let stderr = '';
    child.stdout.on('data', (data) => sendLog(data.toString()));
    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      sendLog(text);
    });
    child.on('error', (error) => reject(new Error(`${label} could not start: ${error.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}.${stderr ? `\n${stderr.slice(-2000)}` : ''}`));
    });
  });
}

function quoteForLog(value) {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    title: 'APK Decompiler Studio',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('dialog:apk', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose an APK file',
    properties: ['openFile'],
    filters: [{ name: 'Android packages', extensions: ['apk'] }, { name: 'All files', extensions: ['*'] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:output', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose output folder',
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('tools:detect', () => detectTools());

ipcMain.handle('decompile:start', async (_event, { apkPath, outputDir }) => {
  if (decompileRunning) throw new Error('A decompilation is already running.');
  if (typeof apkPath !== 'string' || typeof outputDir !== 'string') throw new Error('Choose an APK and output folder first.');
  if (!apkPath.toLowerCase().endsWith('.apk') || !fs.existsSync(apkPath) || !fs.statSync(apkPath).isFile()) {
    throw new Error('The selected APK file could not be found.');
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const tools = detectTools();
  if (!tools.jadx && !tools.apktool) {
    throw new Error('Install JADX and/or APKTool, then make sure the command is available in PATH.');
  }
  if ((tools.jadx || tools.apktool) && !tools.java) {
    throw new Error('Java was not found in PATH. Install a compatible Java runtime and try again.');
  }

  decompileRunning = true;
  try {
    if (tools.jadx) {
      const destination = path.join(outputDir, 'jadx');
      fs.mkdirSync(destination, { recursive: true });
      await runTool(tools.jadx, ['-d', destination, apkPath], 'JADX');
    } else sendLog('\nJADX not found; skipping source decompilation.\n');

    if (tools.apktool) {
      const destination = path.join(outputDir, 'apktool');
      await runTool(tools.apktool, ['d', '-f', '-o', destination, apkPath], 'APKTool');
    } else sendLog('\nAPKTool not found; skipping resource decoding.\n');
    return { outputDir };
  } finally {
    decompileRunning = false;
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
