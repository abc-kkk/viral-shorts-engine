const { Tray, Menu, nativeImage, shell, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { store, isDev } = require('./config');
const { launchDebugChrome } = require('./utils');
const { autoUpdater } = require('electron-updater');

let tray = null;

function createTray(getMainWindow, createMainWindow) {
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // 创建一个最简的占位图标
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📺 打开工作台',
      click: () => {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        } else {
          createMainWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: '🌐 启动调试 Chrome',
      click: () => launchDebugChrome(),
    },
    {
      label: '⚙️ 更改 Chrome 数据目录',
      click: async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: '选择 Chrome 独立用户数据存放目录',
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: store.get('chromeUserDataDir') || path.join(app.getPath('userData'), 'chrome-debug-profile'),
        });
        if (!canceled && filePaths.length > 0) {
          store.set('chromeUserDataDir', filePaths[0]);
          dialog.showMessageBox({
            type: 'info',
            message: 'Chrome 数据目录已更新。下一次启动调试 Chrome 时将使用新目录。',
            detail: `新路径：${filePaths[0]}`,
          });
        }
      },
    },
    {
      label: '📂 打开工作空间',
      click: () => shell.openPath(store.get('workspacePath')),
    },

    { type: 'separator' },
    {
      label: '⚙️ 修改工作空间路径',
      click: async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: '选择新的工作空间',
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: store.get('workspacePath'),
        });
        if (!canceled && filePaths.length > 0) {
          store.set('workspacePath', filePaths[0]);
          dialog.showMessageBox({
            type: 'info',
            message: '工作空间已更新，重启应用后生效。',
            detail: `新路径：${filePaths[0]}`,
          });
        }
      },
    },
    {
      label: '🔄 检查更新',
      click: () => {
        autoUpdater.checkForUpdatesAndNotify();
      },
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Viral Shorts Engine');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    const win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
    }
  });

  return tray;
}

module.exports = {
  createTray,
};
