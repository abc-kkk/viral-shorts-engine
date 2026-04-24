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

  // 判断是否在 Electron 环境
  isElectron: true,
});
