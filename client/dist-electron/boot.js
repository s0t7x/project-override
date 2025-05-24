import require$$0 from "electron";
import require$$1 from "path";
import require$$2 from "url";
import require$$3 from "steamworks.js";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var boot$1 = {};
var hasRequiredBoot;
function requireBoot() {
  if (hasRequiredBoot) return boot$1;
  hasRequiredBoot = 1;
  const { app, BrowserWindow, Menu } = require$$0;
  const path = require$$1;
  const url = require$$2;
  let windowCreated = false;
  const openDevTools = (mainWindow) => {
    const devtools = new BrowserWindow();
    mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  };
  function createWindow() {
    require$$3.electronEnableSteamOverlay();
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        // Keep false for security
        contextIsolation: false,
        // Keep true for security
        webSecurity: false
        // Keep true for security
      }
    });
    const startUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : url.format({
      pathname: path.join(__dirname, "index.html"),
      // Adjust if your build output is different
      protocol: "file:",
      slashes: true
    });
    mainWindow.loadURL(startUrl);
    if (process.env.NODE_ENV === "development") {
      openDevTools(mainWindow);
    } else {
      Menu.setApplicationMenu(false);
      mainWindow.setFullScreen(true);
    }
    windowCreated = true;
  }
  app.whenReady().then(() => {
    if (windowCreated) return;
    const steamworks = require$$3;
    const client = steamworks.init(480);
    console.log(client.localplayer.getName());
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  return boot$1;
}
var bootExports = requireBoot();
const boot = /* @__PURE__ */ getDefaultExportFromCjs(bootExports);
export {
  boot as default
};
