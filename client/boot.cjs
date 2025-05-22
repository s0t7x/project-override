const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  if(process.env.NODE_ENV !== 'development') Menu.setApplicationMenu(false)
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
  const startUrl = process.env.NODE_ENV === 'development'
    ? url.format({
        pathname: path.join(__dirname, 'public', 'index.html'), // Adjust if your dev server is different
        protocol: 'file:',
        slashes: true
      })
    : url.format({
        pathname: path.join(__dirname, 'index.html'), // Adjust if your build output is different
        protocol: 'file:',
        slashes: true
      });

  mainWindow.loadURL(startUrl);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.