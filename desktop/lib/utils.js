const http = require('http');
const { spawn } = require('child_process');
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

  dialog.showMessageBox({
    type: 'info',
    title: 'Chrome 已启动',
    message: '调试模式 Chrome 已启动！',
    detail: '请在此 Chrome 窗口中：\n1. 加载 Viral Shorts Extension 扩展\n2. 登录 Google 账号\n3. 打开 Google Flow 页面\n\n这些设置会被自动保存，下次启动无需重复配置。',
  });
}

module.exports = {
  findAvailablePort,
  waitForServer,
  launchDebugChrome,
};
