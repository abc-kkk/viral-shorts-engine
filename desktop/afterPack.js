const fs = require('fs-extra');
const path = require('path');

exports.default = async function(context) {
  const { appOutDir } = context;
  const isMac = context.packager.platform.name === 'mac';
  const resourcesPath = isMac 
    ? path.join(appOutDir, context.packager.appInfo.productFilename + '.app', 'Contents', 'Resources')
    : path.join(appOutDir, 'resources');

  console.log('\n[afterPack] Copying node_modules directly to bypass electron-builder ignores...');
  
  // Copy Next.js node_modules
  const nextSrc = path.join(__dirname, '..', 'web', '.next', 'standalone', 'node_modules');
  const nextDest = path.join(resourcesPath, 'server', 'node_modules');
  if (fs.existsSync(nextSrc)) {
    await fs.copy(nextSrc, nextDest);
    console.log('[afterPack] Copied Next.js node_modules');
  } else {
    console.warn('[afterPack] Warning: Next.js node_modules not found at', nextSrc);
  }

  // Inject Electron-recompiled better-sqlite3 to fix ABI mismatch
  const sqliteSrc = path.join(__dirname, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(sqliteSrc)) {
    console.log('[afterPack] Searching for all embedded better-sqlite3 modules to fix ABI...');
    
    // 递归搜索所有的 better-sqlite3 文件夹并强制覆盖
    function findAndReplaceSqlite(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // 只要文件夹名以 better-sqlite3 开头（处理 Next.js 哈希目录，如 better-sqlite3-xxxx）
          if (item.startsWith('better-sqlite3')) {
            console.log(`[afterPack] Injecting rebuilt better-sqlite3 into: ${fullPath}`);
            fs.copySync(sqliteSrc, fullPath, { overwrite: true });
          } else {
            findAndReplaceSqlite(fullPath);
          }
        }
      }
    }
    
    findAndReplaceSqlite(nextDest);
    
    // Also check .next/node_modules for Next.js 14+ traces
    const nextHiddenNodeModules = path.join(resourcesPath, 'server', '.next', 'node_modules');
    if (fs.existsSync(nextHiddenNodeModules)) {
      findAndReplaceSqlite(nextHiddenNodeModules);
    }

    console.log('[afterPack] Finished injecting Electron-rebuilt better-sqlite3');
  } else {
    console.warn('[afterPack] Warning: Electron-rebuilt better-sqlite3 not found in desktop node_modules');
  }

  // Copy ai-gateway node_modules
  const gwSrc = path.join(__dirname, '..', 'ai-gateway', 'node_modules');
  const gwDest = path.join(resourcesPath, 'ai-gateway', 'node_modules');
  if (fs.existsSync(gwSrc)) {
    await fs.copy(gwSrc, gwDest);
    console.log('[afterPack] Copied ai-gateway node_modules');
  } else {
    console.warn('[afterPack] Warning: ai-gateway node_modules not found at', gwSrc);
  }
};
