// =====================================================================
// Viral Shorts Engine — Electron Preload Script
// 通过 contextBridge 安全地暴露少量原生能力给渲染进程
// =====================================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本号
  getVersion: () => ipcRenderer.invoke('get-version'),

  // 打开文件管理器
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // 一键启动调试 Chrome
  launchChrome: () => ipcRenderer.invoke('launch-chrome'),

  // 获取工作空间路径
  getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),

  // 更改工作空间路径
  changeWorkspacePath: () => ipcRenderer.invoke('change-workspace-path'),

  // --- 从托盘菜单迁移到 Web UI 的高级工具 ---
  // 更改 Chrome 用户数据目录
  changeChromeDataDir: () => ipcRenderer.invoke('change-chrome-data-dir'),

  // 打开扩展文件夹
  openExtensionFolder: () => ipcRenderer.invoke('open-extension-folder'),

  // 打开工作空间文件夹
  openWorkspaceFolder: () => ipcRenderer.invoke('open-workspace-folder'),

  // 检查应用更新
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // 获取应用版本号 (完整)
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 判断是否在 Electron 环境
  isElectron: true,
});
