const Store = require('electron-store');
const { app } = require('electron');
const path = require('path');

const store = new Store({
  name: 'viral-shorts-config',
  defaults: {
    workspacePath: '',
    chromeUserDataDir: '',
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

function getResourcePath(subPath) {
  if (isDev) {
    // 开发模式：直接指向项目目录 (注意层级)
    return path.join(__dirname, '../..', subPath);
  }
  // 打包模式：从 extraResources 中读取
  return path.join(process.resourcesPath, subPath);
}

module.exports = {
  store,
  isDev,
  NEXT_PORT,
  GATEWAY_PORT,
  getResourcePath
};
