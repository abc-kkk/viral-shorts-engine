const { BrowserWindow, app } = require('electron');
const path = require('path');
const { store, NEXT_PORT } = require('./config');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Viral Shorts Engine',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'darwin' ? false : {
      color: '#0a0a0a',
      symbolColor: '#ffffff',
      height: 40 // 适应 Windows 控件的高度
    },
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false, // 等待加载完成后再显示
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 使用运行时确定的端口
  mainWindow.loadURL(`http://127.0.0.1:${store.get('_runtimeNextPort') || NEXT_PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // macOS 行为：关闭窗口不退出应用
  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
};
