const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

function setupAutoUpdater(getMainWindow) {
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
    const win = getMainWindow();
    if (win) win.setProgressBar(-1);
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
    dialog.showErrorBox('更新下载失败', `网络或服务器异常导致更新失败。请稍后重启软件重试，或前往官网下载。\n\n详情：${err.message}`);
    const win = getMainWindow();
    if (win) win.setProgressBar(-1);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const win = getMainWindow();
    if (win) {
      // 在任务栏图标上显示进度 (0.0 到 1.0)
      win.setProgressBar(progressObj.percent / 100);
    }
  });

  // 启动后延迟检查更新
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 10000);
}

module.exports = {
  setupAutoUpdater,
};
