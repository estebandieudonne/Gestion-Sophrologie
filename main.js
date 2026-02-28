const { app, BrowserWindow, dialog , ipcMain, shell} = require('electron');
const path = require('path');
const net = require('net');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const { pathToFileURL } = require("url");
const fsp = require('fs').promises;

const HOST = '127.0.0.1';
const PORT = 5000;

let mainWindow = null;
let serverProcess = null;
let serverOwned = false;
let splash = null;

// ------------------------------------------------
// SAFE WINDOW CHECKER
// ------------------------------------------------
function isWindowOk(win) {
  return win && !win.isDestroyed();
}

// ------------------------------------------------
// CREATE WINDOWS
// ------------------------------------------------
function createWindow() {
  splash = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    icon: path.join(__dirname, 'app', 'icon.ico')
  });
  splash.loadFile(path.join(__dirname, 'app', 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'app', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));

  const splashStart = Date.now();
  mainWindow.webContents.on('did-finish-load', () => {
    const elapsed = Date.now() - splashStart;
    const minTime = 2000;
    const remaining = Math.max(minTime - elapsed, 0);
    setTimeout(() => {
      if (isWindowOk(splash)) splash.close();
      if (isWindowOk(mainWindow)) {
        mainWindow.show();
        mainWindow.maximize();
      }
    }, remaining);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ------------------------------------------------
// CHECK SERVER
// ------------------------------------------------
function checkServerRunning(timeout = 1000) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let done = false;

    socket.setTimeout(timeout);
    socket.once('error', () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
    socket.once('timeout', () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
    socket.connect(PORT, HOST, () => { if (!done) { done = true; socket.end(); resolve(true); } });
  });
}

// ------------------------------------------------
// SPAWN SERVER
// ------------------------------------------------
function spawnServer() {
	//const exePath = path.join(process.resourcesPath, 'GS-Server.exe'); // Correct pour build
	const exePath = path.join(__dirname, 'app', 'GS-Server.exe'); //pour dev
  if (!fs.existsSync(exePath)) {
    dialog.showErrorBox('Erreur', `Impossible de trouver GS-Server.exe à : ${exePath}`);
    return null;
  }

  const child = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', d => console.log('[server stdout]', d.toString()));
  child.stderr.on('data', d => console.error('[server stderr]', d.toString()));
  child.on('exit', (code, signal) => console.log(`GS-Server.exe exited code=${code} signal=${signal}`));

  return child;
}

// ------------------------------------------------
// START OR CONNECT SERVER
// ------------------------------------------------
async function startOrConnectServer() {
  const running = await checkServerRunning(800);
  if (running) {
    console.log('Un serveur écoute déjà — on ne démarre pas de nouveau serveur Python.');
    serverOwned = false;
    return;
  }

  console.log('Aucun serveur détecté — on démarre GS-Server.exe');
  const child = spawnServer();
  if (!child) throw new Error('Echec démarrage GS-Server.exe');

  serverProcess = child;
  serverOwned = true;

  const maxWait = 8000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const ok = await checkServerRunning(300);
    if (ok) {
      console.log('GS-Server.exe prêt');
      return;
    }
    await new Promise(res => setTimeout(res, 300));
  }
  console.warn('Timeout: le serveur n\'a pas répondu après démarrage.');
}

// ------------------------------------------------
// STOP SERVER
// ------------------------------------------------
function stopServerIfOwned() {
  if (serverOwned) {
    try {
      console.log('Arrêt de tous les GS-Server.exe...');
      if (process.platform === 'win32') {
        execSync('taskkill /IM GS-Server.exe /F /T', { stdio: 'ignore' });
      }
      serverProcess = null;
    } catch (err) {
      console.error('Erreur arrêt GS-Server.exe:', err);
    }
  }
}

// ------------------------------------------------
// REGISTER IPC HANDLERS
// ------------------------------------------------
function registerIpcHandlers() {

    // ---------------------------------------------------------
    // Copier une facture dans le dossier data/factures
    // ---------------------------------------------------------
    ipcMain.handle("copy-facture", async (event, sourcePath, fileName) => {
        console.log("Handler copy-facture :", sourcePath, fileName);

        const folder = path.join(process.env.APPDATA, "Gestion_Sophrologie", "data", "factures");
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

        const dest = path.join(folder, fileName);
        fs.copyFileSync(sourcePath, dest);

        return dest;
    });


    // ---------------------------------------------------------
    // Ouvrir un fichier PDF
    // ---------------------------------------------------------
    ipcMain.handle("open-file", async (event, filePath) => {
        console.log("Chemin reçu pour open-file :", filePath);

        try {
            const fileURL = pathToFileURL(filePath).href;
            console.log("URL utilisée :", fileURL);
            await shell.openExternal(fileURL);
        } catch (error) {
            console.error("Erreur ouverture fichier :", error);
            throw error;
        }
    });

	// ---------------------------------------------------------
    // Ouvrir un fichier openPdfInApp
    // ---------------------------------------------------------
	ipcMain.handle("open-pdf-in-window", async (event, filePath) => {
    // Vérification du fichier
    if (!fs.existsSync(filePath)) {
        console.log("Fichier introuvable :", filePath);
        return { status: "error" };
    }

    const pdfWindow = new BrowserWindow({
        width: 900,
        height: 1000,
        title: "Gestion Sophrologie PDF",
        icon: path.join(__dirname, "app", "icon.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const fileURL = pathToFileURL(filePath).href;

    // Charge le PDF directement
    pdfWindow.loadURL(fileURL);

    return { status: "ok" };
	});

    // ---------------------------------------------------------
    // Sélection d'une facture PDF
    // ---------------------------------------------------------
    ipcMain.handle("select-facture", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (result.canceled) return null;
        return result.filePaths[0];
    });
	
	// ---------------------------------------------------------
    // Sélection d'un dossier
    // ---------------------------------------------------------
	ipcMain.handle("select-folder", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"]  // propriété pour choisir un dossier
		});

		console.log('Résultat dialog:', result);
		if (result.canceled) return null;
		return result.filePaths[0];  // chemin du dossier sélectionné
	});
	
	
	// ---------------------------------------------------------
    // Récupérer factures du client
    // ---------------------------------------------------------
	ipcMain.handle('get-client-factures', async (event, { clientName, facturesFolder }) => {
	try {
		const factures = [];

		// Lire les dossiers années dans facturesFolder
		const years = await fsp.readdir(facturesFolder, { withFileTypes: true });
		const yearDirs = years.filter(d => d.isDirectory()).map(d => d.name);

		// Pour chaque année, chercher le dossier client
		for (const year of yearDirs) {
			const clientDir = path.join(facturesFolder, year, clientName);

		// Vérifier si le dossier client existe
		try {
			const stat = await fsp.stat(clientDir);
        if (!stat.isDirectory()) continue;
			} catch (err) {
        // Dossier client non trouvé pour cette année, on passe à l'année suivante
        continue;
		}

		// Lire les fichiers dans le dossier client
		const files = await fsp.readdir(clientDir, { withFileTypes: true });

		// Ajouter les fichiers (factures) à la liste, avec chemin complet
		for (const file of files) {
			if (file.isFile()) {
				factures.push(path.join(clientDir, file.name));
				}
			}
		}

		return factures; // tableau des chemins complets des factures

		} catch (error) {
			console.error('Erreur récupération factures client :', error);
		throw error; // transmet l'erreur au renderer
		}
	});
	
	// ---------------------------------------------------------
    // Ouvrir le dossier /data
    // ---------------------------------------------------------
    ipcMain.handle("open-data-folder", async () => {
        const folderPath = path.join(process.env.APPDATA, "Gestion_Sophrologie", "data");

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        await shell.openPath(folderPath);
    });

    // ---------------------------------------------------------
    // Ouvrir PDF
    // ---------------------------------------------------------
    ipcMain.handle("open-guide-pdf", async () => {
    let pdfPath;
    if (app.isPackaged) {
        pdfPath = path.join(process.resourcesPath, 'guide-utilisation.pdf');
    } else {
        pdfPath = path.join(__dirname, 'app', 'guide-utilisation.pdf');
    }

    if (!fs.existsSync(pdfPath)) {
        console.log("Fichier PDF introuvable :", pdfPath);
        return { status: "error" };
    }

    const { BrowserWindow } = require("electron");
    const { pathToFileURL } = require("url");

    const pdfWindow = new BrowserWindow({
        width: 900,
        height: 1000,
        title: "Gestion Sophrologie PDF",
        icon: path.join(__dirname, "app","icon.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const fileURL = pathToFileURL(pdfPath).href;
    pdfWindow.loadURL(fileURL);

    return { status: "ok" };
	});
}

module.exports = { registerIpcHandlers };


// ---------------------------------------------------------
// CleanBackups
// ---------------------------------------------------------
const backupDir = path.join(
  process.env.APPDATA || app.getPath('appData'),
  'Gestion_Sophrologie',
  'data'
);

function extractDateFromFilename(filename) {
  const match = filename.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.json/);
  if (!match) return null;
  // Transformer en ISO 8601 : "YYYY-MM-DDTHH:MM:SS"
  const dateStr = match[1]
    .replace('_', 'T')
    .replace(/-(?=\d{2}-\d{2}$)/, ':')
    .replace(/-(?=\d{2}$)/, ':');
  return new Date(dateStr);
}

async function cleanOldBackups() {
  if (!fs.existsSync(backupDir)) return;

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      date: extractDateFromFilename(f)
    }))
    .filter(f => f.date !== null)
    .sort((a, b) => b.date - a.date); // du plus récent au plus ancien

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const backupsToday = files.filter(f => f.date >= today);
  const backupsBefore = files.filter(f => f.date < today);

  // Garde un backup par heure pour aujourd'hui (le plus récent de chaque heure)
  const keptHours = new Set();
  const keepToday = [];
  for (const b of backupsToday) {
    const hour = b.date.getHours();
    if (!keptHours.has(hour)) {
      keptHours.add(hour);
      keepToday.push(b);
    }
  }

  // Garde un backup par jour pour les jours avant aujourd'hui, max 10 jours
  const keptDays = new Set();
  const keepBefore = [];
  for (const b of backupsBefore) {
    const dayKey = b.date.toISOString().slice(0, 10);
    if (!keptDays.has(dayKey)) {
	  if (keptDays.size >= 10) break;
      keptDays.add(dayKey);
      keepBefore.push(b);
    }
  }

  const toKeep = new Set([...keepToday.map(b => b.name), ...keepBefore.map(b => b.name)]);
	
	console.log('Backups aujourd’hui trouvés :', backupsToday.map(b => b.name));
	console.log('Backups à garder aujourd’hui :', keepToday.map(b => b.name));
	
  for (const f of files) {
    if (!toKeep.has(f.name)) {
      try {
        fs.unlinkSync(path.join(backupDir, f.name));
        console.log(`Backup supprimé : ${f.name}`);
      } catch (err) {
        console.error(`Erreur suppression backup ${f.name} :`, err);
      }
    }
  }
}

ipcMain.handle('clean-old-backups', async () => {
  await cleanOldBackups();
  return { status: 'done' };
});

app.whenReady().then(() => {
  cleanOldBackups().catch(console.error);
});










// ------------------------------------------------
// SINGLE INSTANCE
// ------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (isWindowOk(mainWindow)) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Enregistrement des handlers IPC avant la création de la fenêtre
    registerIpcHandlers(); 

    try {
      await startOrConnectServer();
    } catch (err) {
      console.error('Erreur startOrConnectServer', err);
      dialog.showErrorBox('Erreur', 'Impossible de démarrer ou de joindre le serveur.');
    }
    createWindow();
  });

  app.on('before-quit', () => stopServerIfOwned());

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  process.on('SIGINT', () => { stopServerIfOwned(); process.exit(); });
  process.on('SIGTERM', () => { stopServerIfOwned(); process.exit(); });
}
