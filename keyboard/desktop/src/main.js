const { app, BrowserWindow, globalShortcut, clipboard, ipcMain } = require("electron");
const path = require("path");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 420,
    height: 620,
    alwaysOnTop: true,
    title: "MandarinMind Keyboard",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile(path.join(__dirname, "renderer.html"));
}

app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+M", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle("keyboard-config", () => ({
  apiBaseUrl: process.env.MANDARIN_MIND_API_BASE_URL || "http://localhost:5000",
  accessToken: process.env.MANDARIN_MIND_ACCESS_TOKEN || ""
}));

ipcMain.handle("copy-text", (_event, text) => {
  clipboard.writeText(text);
  return true;
});
