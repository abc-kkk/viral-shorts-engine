const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { store, isDev } = require('./config');

let nextProcess = null;
let gatewayProcess = null;

function startNextServer(port, gatewayPort) {
  const serverDir = isDev
    ? path.join(__dirname, '../..', 'web')
    : path.join(process.resourcesPath, 'server');

  const serverEntry = isDev ? null : path.join(serverDir, 'server.js');
  const workspacePath = store.get('workspacePath');
  console.log('[Main] Resolved Workspace Path:', workspacePath);
  const dbPath = path.join(workspacePath || '', 'viral-shorts.db');

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
  };

  if (isDev) {
    console.log('[Main] Starting Next.js in dev mode (bound to 127.0.0.1)...');
    nextProcess = spawn('npm', ['run', 'dev', '--', '-H', '127.0.0.1'], {
      cwd: serverDir,
      env,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    console.log('[Main] Starting Next.js standalone server...');

    if (!fs.existsSync(dbPath)) {
      console.log('[Main] Database not found. Drizzle will initialize it via migrations.');
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

function startGateway(port) {
  const gatewayDir = isDev
    ? path.join(__dirname, '../..', 'ai-gateway')
    : path.join(process.resourcesPath, 'ai-gateway');

  const env = {
    ...process.env,
    PORT: String(port),
    CHROME_CDP_URL: 'http://127.0.0.1:9222',
    ELECTRON_RUN_AS_NODE: '1',
  };

  if (isDev) {
    console.log('[Main] Starting ai-gateway in dev mode...');
    if (process.platform === 'darwin') {
      const binDir = path.join(gatewayDir, 'node_modules', '.bin');
      env.PATH = binDir + path.delimiter + (env.PATH || '');
    }
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

function killProcessTree(childProcess, name) {
  if (!childProcess || childProcess.killed) return;
  console.log(`[Main] Shutting down ${name}...`);
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${childProcess.pid} /T /F`, { stdio: 'ignore' });
    } catch (e) {
      // 忽略无法找到进程的错误
    }
  } else {
    childProcess.kill('SIGTERM');
  }
}

function stopProcesses() {
  killProcessTree(nextProcess, 'Next.js');
  killProcessTree(gatewayProcess, 'ai-gateway');
}

module.exports = {
  startNextServer,
  startGateway,
  stopProcesses,
};
