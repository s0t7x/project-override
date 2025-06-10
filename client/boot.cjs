const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

let windowCreated = false;

let steamworks = undefined;

app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('use-angle', 'd3d11');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

const openDevTools = async (mainWindow) => {
  const devtools = new BrowserWindow()
  mainWindow.webContents.setDevToolsWebContents(devtools.webContents)
  mainWindow.webContents.openDevTools({ mode: 'detach' })
  const gpuInfo = await app.getGPUInfo('basic');
  console.log(app.getGPUFeatureStatus(), gpuInfo);
} 

function createWindow() {
  try{
    // require('steamworks.js').electronEnableSteamOverlay()
  } catch (err) {
    if(process.env.NODE_ENV !== 'development') return;
    console.log("Cannot connect to steam")
    steamworks = undefined;
  }


  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // Keep false for security
      contextIsolation: false, // Keep true for security
      webSecurity: false // Keep true for security
    }
  });

  // Load the index.html of the app.
  // Assuming your built client app is in a 'dist' or 'build' folder relative to main.js
  // If your client is served directly from 'public', you might need to adjust this path.
  console.log(process.env.NODE_ENV)
  const startUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : url.format({
        pathname: path.join(__dirname, 'index.html'), // Adjust if your build output is different
        protocol: 'file:',
        slashes: true
      });
      
      mainWindow.loadURL(startUrl);
      
  // Open the DevTools.
  // if(process.env.NODE_ENV === 'development') {
    openDevTools(mainWindow)
  // } else {
  //   Menu.setApplicationMenu(false)
  //   mainWindow.setFullScreen(true)
  // }

  windowCreated = true;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if(windowCreated) return;

  if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
  }

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});