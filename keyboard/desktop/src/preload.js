const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mandarinMind", {
  getConfig: () => ipcRenderer.invoke("keyboard-config"),
  copyText: (text) => ipcRenderer.invoke("copy-text", text)
});
