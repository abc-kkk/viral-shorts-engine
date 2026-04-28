// =====================================================================
// Viral Shorts Engine — Electron 主进程
// 职责：组装子进程、创建窗口、处理核心 IPC 与生命周期
// =====================================================================

const { app, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// --- 模块化导入 ---
const { store, isDev, NEXT_PORT, GATEWAY_PORT } = require('./lib/config');
const { runFirstTimeSetup } = require('./lib/setup');
const { findAvailablePort, forceKillPortOccupier, waitForServer, launchDebugChrome } = require('./lib/utils');
const { startNextServer, startGateway, stopProcesses } = require('./lib/processManager');
const { createMainWindow, getMainWindow } = require('./lib/windowManager');
const { createTray } = require('./lib/trayManager');
const { setupAutoUpdater } = require('./lib/updater');

// ========================================
// 应用生命周期
// ========================================

// 禁止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  console.log('[Main] Viral Shorts Engine Desktop starting...');

  // 注册 IPC Handlers
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('open-folder', (_event, folderPath) => shell.openPath(folderPath));
  ipcMain.handle('launch-chrome', () => launchDebugChrome({ silent: true }));
  ipcMain.handle('get-workspace-path', () => store.get('workspacePath'));

  // --- 从托盘菜单迁移到 Web UI 的高级工具 ---
  ipcMain.handle('change-chrome-data-dir', async () => {
    const mainWindow = getMainWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow || {}, {
      title: '选择 Chrome 独立用户数据存放目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: store.get('chromeUserDataDir') || path.join(app.getPath('userData'), 'chrome-debug-profile'),
    });
    if (!canceled && filePaths.length > 0) {
      store.set('chromeUserDataDir', filePaths[0]);
      return filePaths[0];
    }
    return null;
  });



  ipcMain.handle('open-workspace-folder', () => {
    const ws = store.get('workspacePath');
    if (ws) return shell.openPath(ws);
  });

  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('change-workspace-path', async () => {
    const mainWindow = getMainWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '📁 更改短剧项目工作空间文件夹',
      message: '请选择新的文件夹用于存放所有短剧项目数据。注意：更改目录后，应用将重新启动。',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: store.get('workspacePath') || path.join(app.getPath('documents'), '短剧项目'),
      buttonLabel: '选择此文件夹',
    });

    if (!canceled && filePaths.length > 0) {
      store.set('workspacePath', filePaths[0]);
      
      const response = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '✅ 目录已更改',
        message: '工作空间已成功更改！',
        detail: `新目录：${filePaths[0]}\n\n应用需要重新启动以应用新的数据库和存储路径。是否立即重启？`,
        buttons: ['立即重启', '稍后手动重启'],
      });

      if (response.response === 0) {
        app.relaunch();
        app.exit(0);
      }
      return true;
    }
    return false;
  });

  // 首次运行引导
  if (store.get('firstRun') || !store.get('workspacePath')) {
    await runFirstTimeSetup();
  }

  // 确保工作空间目录存在
  const ws = store.get('workspacePath');
  if (!fs.existsSync(ws)) {
    fs.mkdirSync(ws, { recursive: true });
  }

  // 清理上次异常退出后可能残留的僵尸进程（根因修复：防止 Next.js 16 "Another dev server" 冲突）
  forceKillPortOccupier(NEXT_PORT);
  forceKillPortOccupier(GATEWAY_PORT);

  let actualNextPort = NEXT_PORT;
  let actualGatewayPort = GATEWAY_PORT;
  try {
    actualGatewayPort = await findAvailablePort(GATEWAY_PORT);
    actualNextPort = await findAvailablePort(NEXT_PORT);
    if (actualNextPort !== NEXT_PORT) console.log(`[Main] Next.js port changed: ${NEXT_PORT} → ${actualNextPort}`);
    if (actualGatewayPort !== GATEWAY_PORT) console.log(`[Main] Gateway port changed: ${GATEWAY_PORT} → ${actualGatewayPort}`);
  } catch (e) {
    dialog.showErrorBox('端口分配失败', e.message);
    app.quit();
    return;
  }

  // 启动后端服务
  startGateway(actualGatewayPort);
  startNextServer(actualNextPort, actualGatewayPort);
  store.set('_runtimeNextPort', actualNextPort);

  // 创建系统托盘
  createTray(getMainWindow, createMainWindow);

  // 等待 Next.js 服务就绪
  console.log(`[Main] Waiting for Next.js server on port ${actualNextPort}...`);
  try {
    await waitForServer(actualNextPort, 60000); // 最长等 60 秒
    console.log('[Main] Next.js server is ready!');
  } catch (e) {
    console.error('[Main] Server startup failed:', e);
    dialog.showErrorBox(
      '服务启动失败',
      `Next.js 服务未能在 60 秒内启动。\n请检查控制台日志。\n\n错误：${e.message}`
    );
    app.quit();
    return;
  }

  // 创建主窗口
  createMainWindow();

  // 设置自动更新（仅在打包模式下）
  if (!isDev) {
    setupAutoUpdater(getMainWindow);
  }
});

app.on('activate', () => {
  // macOS: 点击 dock 图标时恢复窗口
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.show();
  } else {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopProcesses();
});

app.on('window-all-closed', () => {
  // macOS: 保持应用在后台运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理终端的 Ctrl+C (SIGINT/SIGTERM) 信号，确保触发完整的退出清理流程
process.on('SIGINT', () => {
  console.log('[Main] Received SIGINT (Ctrl+C), quitting gracefully...');
  app.quit();
});

process.on('SIGTERM', () => {
  console.log('[Main] Received SIGTERM, quitting gracefully...');
  app.quit();
});
