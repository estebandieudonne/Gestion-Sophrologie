// preload.js
const { contextBridge, ipcRenderer, shell} = require("electron");

contextBridge.exposeInMainWorld("electron", {
    invoke: (channel, data) => ipcRenderer.invoke(channel, data),
});

contextBridge.exposeInMainWorld("api", {
    selectFacture: async () => ipcRenderer.invoke("select-facture"),
    copyFactureToData: (source, name) => ipcRenderer.invoke("copy-facture", source, name),
    openFile: (p) => ipcRenderer.invoke("open-file", p),
    openGuidePdf: (p) => ipcRenderer.invoke("open-guide-pdf", p),
	openPdfInApp: (p) => ipcRenderer.invoke("open-pdf-in-window", p),
	cleanOldBackups: () => ipcRenderer.invoke('clean-old-backups'),
	selectDossier: async () => ipcRenderer.invoke("select-folder"),
	getClientFactures: async (params) => ipcRenderer.invoke('get-client-factures', params),
	openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
});