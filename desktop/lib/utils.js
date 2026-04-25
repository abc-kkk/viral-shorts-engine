const http = require('http');
const { spawn, execSync } = require('child_process');
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { store } = require('./config');

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
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

/**
 * 强制杀掉占用指定端口的进程（仅 Windows）。
 * 用于清理上次异常退出后残留的僵尸 Next.js / Gateway 进程。
 */
function forceKillPortOccupier(port) {
  if (process.platform !== 'win32') return;
  try {
    const result = execSync(`netstat -aon | findstr ":${port} " | findstr "LISTENING"`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && pid !== String(process.pid)) pids.add(pid);
    }
    for (const pid of pids) {
      console.log(`[Main] Killing zombie process on port ${port} (PID ${pid})...`);
      try {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      } catch { /* already dead */ }
    }
  } catch {
    // No process on that port — good
  }
}

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

async function launchDebugChrome(options = {}) {
  const chromePaths = {
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    ],
  };

  let chromePath = store.get('customChromePath');

  if (!chromePath || !fs.existsSync(chromePath)) {
    if (process.platform === 'darwin') {
      chromePath = chromePaths.darwin;
      if (!fs.existsSync(chromePath)) chromePath = null;
    } else if (process.platform === 'win32') {
      chromePath = chromePaths.win32.find((p) => fs.existsSync(p));
    } else {
      dialog.showErrorBox('不支持的平台', '暂不支持 Linux。');
      return;
    }

    if (!chromePath) {
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        title: '未找到 Chrome',
        message: '无法在系统默认路径下找到 Google Chrome。',
        detail: '如果您的 Chrome 安装在其他盘符，或正在使用其他 Chromium 内核浏览器（如 Edge、Brave），请点击“手动查找”来选择浏览器主程序（如 chrome.exe）。',
        buttons: ['手动查找', '取消'],
        defaultId: 0,
        cancelId: 1,
      });

      if (response === 0) {
        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: '选择浏览器可执行文件',
          filters: [
            { name: '浏览器程序', extensions: process.platform === 'win32' ? ['exe'] : ['app', '*'] }
          ],
          properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
          chromePath = filePaths[0];
          // Mac 下如果选了 .app，尝试找到内部真实的可执行文件
          if (process.platform === 'darwin' && chromePath.endsWith('.app')) {
            const appName = path.basename(chromePath, '.app');
            let binPath = path.join(chromePath, 'Contents', 'MacOS', 'Google Chrome');
            if (!fs.existsSync(binPath)) binPath = path.join(chromePath, 'Contents', 'MacOS', appName);
            chromePath = binPath;
          }
          store.set('customChromePath', chromePath);
        } else {
          return;
        }
      } else {
        return;
      }
    }
  }

  // 使用自定义或默认的用户数据目录
  let userDataDir = store.get('chromeUserDataDir');
  if (!userDataDir) {
    userDataDir = path.join(app.getPath('userData'), 'chrome-debug-profile');
  }

  const chromeProcess = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
  ], { detached: true, stdio: 'ignore' });

  chromeProcess.unref();

  // 从 Web UI 调用时静默返回，不弹原生对话框
  if (options?.silent) {
    return { success: true };
  }

  dialog.showMessageBox({
    type: 'info',
    title: 'Chrome 已启动',
    message: '调试模式 Chrome 已启动！',
    detail: '请在此 Chrome 窗口中：\n1. 加载 Viral Shorts Extension 扩展\n2. 登录 Google 账号\n3. 打开 Google Flow 页面\n\n这些设置会被自动保存，下次启动无需重复配置。',
  });
  return { success: true };
}

module.exports = {
  findAvailablePort,
  forceKillPortOccupier,
  waitForServer,
  launchDebugChrome,
};
