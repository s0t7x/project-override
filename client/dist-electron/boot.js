import require$$0 from "electron";
import require$$1 from "path";
import require$$2 from "url";
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
  app.commandLine.appendSwitch("ignore-gpu-blacklist");
  app.commandLine.appendSwitch("use-angle", "d3d11");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
  app.commandLine.appendSwitch("disable-software-rasterizer");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
  app.commandLine.appendSwitch("no-sandbox");
  const openDevTools = async (mainWindow) => {
    const devtools = new BrowserWindow();
    mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    const gpuInfo = await app.getGPUInfo("basic");
    console.log(app.getGPUFeatureStatus(), gpuInfo);
  };
  function createWindow() {
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
    console.log(process.env.NODE_ENV);
    const startUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : url.format({
      pathname: path.join(__dirname, "index.html"),
      // Adjust if your build output is different
      protocol: "file:",
      slashes: true
    });
    mainWindow.loadURL(startUrl);
    openDevTools(mainWindow);
    windowCreated = true;
  }
  app.whenReady().then(() => {
    if (windowCreated) return;
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
