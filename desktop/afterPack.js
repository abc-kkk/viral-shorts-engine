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
  const sqliteDest = path.join(nextDest, 'better-sqlite3');
  const sqliteNestedDest = path.join(nextDest, '@prisma', 'adapter-better-sqlite3', 'node_modules', 'better-sqlite3');
  const sqliteSrc = path.join(__dirname, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(sqliteSrc)) {
    await fs.copy(sqliteSrc, sqliteDest, { overwrite: true });
    
    // Also inject into nested node_modules if it exists (very common with Prisma adapters)
    if (fs.existsSync(path.join(nextDest, '@prisma', 'adapter-better-sqlite3', 'node_modules'))) {
      await fs.copy(sqliteSrc, sqliteNestedDest, { overwrite: true });
    }
    
    console.log('[afterPack] Injected Electron-rebuilt better-sqlite3 to fix ABI mismatch');
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
