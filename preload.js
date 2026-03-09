/*
 * © 2026 Esteban Dieudonné - Gestion Sophrologie
 *
 * Ce fichier est libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la Licence Publique Générale GNU version 3 ou ultérieure.
 *
 * Ce fichier est distribué sans aucune garantie.
 *
 * Pour plus de détails, consultez : https://www.gnu.org/licenses/gpl-3.0.html
 */

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