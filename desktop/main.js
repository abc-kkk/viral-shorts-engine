// =====================================================================
// Viral Shorts Engine — Electron 主进程
// 职责：管理 Next.js + ai-gateway 子进程、创建窗口、首次引导向导
// =====================================================================

const { app, BrowserWindow, dialog, shell, Tray, Menu, nativeImage, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const Store = require('electron-store');

// ========================================
// 常量 & 配置
// ========================================

const store = new Store({
  name: 'viral-shorts-config',
  defaults: {
    workspacePath: '',
    minimaxApiKey: '',
    minimaxBaseUrl: 'https://api.minimax.chat/v1',
    aiGatewayPort: 4100,
    nextPort: 3000,
    firstRun: true,
  },
});

const isDev = !app.isPackaged;
const NEXT_PORT = store.get('nextPort');
const GATEWAY_PORT = store.get('aiGatewayPort');

// 子进程句柄
let nextProcess = null;
let gatewayProcess = null;
let mainWindow = null;
let tray = null;

// ========================================
// 资源路径解析
// ========================================

function getResourcePath(subPath) {
  if (isDev) {
    // 开发模式：直接指向项目目录
    return path.join(__dirname, '..', subPath);
  }
  // 打包模式：从 extraResources 中读取
  return path.join(process.resourcesPath, subPath);
}

// ========================================
// 首次引导向导
// ========================================

async function runFirstTimeSetup() {
  // 步骤 1：选择工作空间目录
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: '📁 选择你的短剧项目工作空间文件夹',
    message: '请选择一个文件夹用于存放所有短剧项目数据（剧本、图片、视频等）。\n建议选择"文稿"或"桌面"下的文件夹。',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: path.join(app.getPath('documents'), '短剧项目'),
    buttonLabel: '选择此文件夹',
  });

  if (canceled || filePaths.length === 0) {
    // 用户取消了，使用默认路径
    const defaultPath = path.join(app.getPath('documents'), '短剧项目');
    if (!fs.existsSync(defaultPath)) fs.mkdirSync(defaultPath, { recursive: true });
    store.set('workspacePath', defaultPath);
  } else {
    store.set('workspacePath', filePaths[0]);
  }

  // 步骤 2：API Key 配置（可选）
  // 暂时使用 dialog.showMessageBox 提示用户稍后在设置中配置
  await dialog.showMessageBox({
    type: 'info',
    title: '✅ 准备就绪',
    message: '工作空间已设置！',
    detail: `工作空间路径：${store.get('workspacePath')}\n\n提示：请确保在 Chrome 中安装 Viral Shorts Extension 扩展`,
    buttons: ['开始使用'],
  });

  store.set('firstRun', false);
}

// ========================================
// 子进程管理：Next.js Standalone Server
// ========================================

function startNextServer(port, gatewayPort) {
  const serverDir = isDev
    ? path.join(__dirname, '..', 'web')
    : path.join(process.resourcesPath, 'server');

  const serverEntry = isDev ? null : path.join(serverDir, 'server.js');
  const workspacePath = store.get('workspacePath');
  const dbPath = path.join(workspacePath, 'viral-shorts.db');

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    WORKSPACE_PATH: workspacePath,
    DATABASE_URL: `file:${dbPath}`,
    AI_GATEWAY_URL: `http://localhost:${gatewayPort}`,
    MINIMAX_API_KEY: store.get('minimaxApiKey') || '',
    MINIMAX_BASE_URL: store.get('minimaxBaseUrl'),
    ELECTRON_RUN_AS_NODE: '1',
    PRISMA_TEMPLATE_PATH: isDev 
      ? path.join(__dirname, '..', 'web', 'prisma', 'template.db')
      : path.join(process.resourcesPath, 'prisma', 'template.db'),
  };

  if (isDev) {
    // 开发模式：直接 npm run dev
    console.log('[Main] Starting Next.js in dev mode...');
    nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: serverDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    // 生产模式：运行 standalone server.js
    console.log('[Main] Starting Next.js standalone server...');

    // 首次运行时需要初始化数据库
    if (!fs.existsSync(dbPath)) {
      console.log('[Main] Initializing SQLite database from template...');
      try {
        if (fs.existsSync(env.PRISMA_TEMPLATE_PATH)) {
          fs.copyFileSync(env.PRISMA_TEMPLATE_PATH, dbPath);
          console.log('[Main] Database template copied successfully.');
        } else {
          console.error('[Main] Template database not found at:', env.PRISMA_TEMPLATE_PATH);
        }
      } catch (e) {
        console.error('[Main] Failed to copy database template:', e);
      }
    }

    nextProcess = spawn(process.execPath, [serverEntry], {
      cwd: serverDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js ERR] ${data.toString().trim()}`);
  });

  nextProcess.on('exit', (code) => {
    console.log(`[Next.js] Process exited with code ${code}`);
  });
}

// ========================================
// 子进程管理：ai-gateway
// ========================================

function startGateway(port) {
  const gatewayDir = isDev
    ? path.join(__dirname, '..', 'ai-gateway')
    : path.join(process.resourcesPath, 'ai-gateway');

  const env = {
    ...process.env,
    PORT: String(port),
    CHROME_CDP_URL: 'http://127.0.0.1:9222',
    ELECTRON_RUN_AS_NODE: '1',
  };

  if (isDev) {
    console.log('[Main] Starting ai-gateway in dev mode...');
    gatewayProcess = spawn('npm', ['run', 'dev'], {
      cwd: gatewayDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    console.log('[Main] Starting ai-gateway...');
    // 生产模式下使用打包的 js 运行
    const serverEntry = path.join(gatewayDir, 'dist', 'server.js');
    gatewayProcess = spawn(process.execPath, [serverEntry], {
      cwd: gatewayDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  gatewayProcess.stdout.on('data', (data) => {
    console.log(`[Gateway] ${data.toString().trim()}`);
  });

  gatewayProcess.stderr.on('data', (data) => {
    console.error(`[Gateway ERR] ${data.toString().trim()}`);
  });

  gatewayProcess.on('exit', (code) => {
    console.log(`[Gateway] Process exited with code ${code}`);
  });
}

// ========================================
// 端口可用性检测
// ========================================

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) return port;
    console.log(`[Main] Port ${port} is in use, trying ${port + 1}...`);
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts}`);
}

// ========================================
// 等待服务就绪
// ========================================

function waitForServer(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve();
      });

      req.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
        } else {
          setTimeout(check, 500);
        }
      });

      req.end();
    }

    check();
  });
}

// ========================================
// 窗口创建
// ========================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Viral Shorts Engine',
    titleBarStyle: 'hiddenInset',  // macOS 下融合标题栏
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0a0a',
    show: false, // 等待加载完成后再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 使用运行时确定的端口（支持端口冲突自动切换）
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
}

// ========================================
// 系统托盘
// ========================================

function createTray() {
  // 使用一个 16x16 的简单图标占位（后续替换为真实图标）
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
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
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
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
      label: '📂 打开工作空间',
      click: () => shell.openPath(store.get('workspacePath')),
    },
    {
      label: '📦 打开扩展文件夹',
      click: () => {
        const extPath = isDev
          ? path.join(__dirname, '..', 'web', 'viral-shorts-extension')
          : path.join(process.resourcesPath, 'viral-shorts-extension');
        shell.openPath(extPath);
      },
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
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ========================================
// 一键启动调试 Chrome
// ========================================

function launchDebugChrome() {
  const chromePaths = {
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ],
  };

  let chromePath;

  if (process.platform === 'darwin') {
    chromePath = chromePaths.darwin;
    if (!fs.existsSync(chromePath)) {
      dialog.showErrorBox('未找到 Chrome', '请安装 Google Chrome 后重试。');
      return;
    }
  } else if (process.platform === 'win32') {
    chromePath = chromePaths.win32.find((p) => fs.existsSync(p));
    if (!chromePath) {
      dialog.showErrorBox('未找到 Chrome', '请安装 Google Chrome 后重试。');
      return;
    }
  } else {
    dialog.showErrorBox('不支持的平台', '暂不支持 Linux。');
    return;
  }

  // 使用独立的用户数据目录，避免干扰用户主 Chrome
  const userDataDir = path.join(app.getPath('userData'), 'chrome-debug-profile');

  const chromeProcess = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
  ], { detached: true, stdio: 'ignore' });

  chromeProcess.unref();

  dialog.showMessageBox({
    type: 'info',
    title: 'Chrome 已启动',
    message: '调试模式 Chrome 已启动！',
    detail: '请在此 Chrome 窗口中：\n1. 加载 Viral Shorts Extension 扩展\n2. 登录 Google 账号\n3. 打开 Google Flow 页面\n\n这些设置会被自动保存，下次启动无需重复配置。',
  });
}

// ========================================
// 自动更新 (GitHub Releases)
// ========================================

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${info.version}，是否立即下载？`,
      buttons: ['下载更新', '稍后再说'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '更新已就绪',
      message: '新版本已下载完成，是否立即安装并重启？',
      buttons: ['立即安装', '下次启动时安装'],
    }).then((result) => {
      if (result.response === 0) {
        app.isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
  });

  // 启动后延迟检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 10000);
}

// ========================================
// 应用生命周期
// ========================================

// 禁止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  console.log('[Main] Viral Shorts Engine Desktop starting...');

  // 注册 IPC Handlers（preload.js 中声明的通道）
  ipcMain.handle('get-version', () => app.getVersion());
  ipcMain.handle('open-folder', (_event, folderPath) => shell.openPath(folderPath));
  ipcMain.handle('launch-chrome', () => launchDebugChrome());
  ipcMain.handle('get-workspace-path', () => store.get('workspacePath'));

  ipcMain.handle('change-workspace-path', async () => {
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

  // 检测并分配可用端口（防止端口冲突）
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

  // 启动后端服务（使用实际可用端口）
  startGateway(actualGatewayPort);
  startNextServer(actualNextPort, actualGatewayPort);
  store.set('_runtimeNextPort', actualNextPort);

  // 创建系统托盘
  createTray();

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
  }

  // 创建主窗口
  createMainWindow();

  // 设置自动更新（仅在打包模式下）
  if (!isDev) {
    setupAutoUpdater();
  }
});

app.on('activate', () => {
  // macOS: 点击 dock 图标时恢复窗口
  if (mainWindow) {
    mainWindow.show();
  } else {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;

  // 优雅关闭子进程
  if (nextProcess && !nextProcess.killed) {
    console.log('[Main] Shutting down Next.js...');
    nextProcess.kill('SIGTERM');
  }
  if (gatewayProcess && !gatewayProcess.killed) {
    console.log('[Main] Shutting down ai-gateway...');
    gatewayProcess.kill('SIGTERM');
  }
});

app.on('window-all-closed', () => {
  // macOS: 保持应用在后台运行
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
