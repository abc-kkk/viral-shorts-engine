const { dialog, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { store } = require('./config');

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
  await dialog.showMessageBox({
    type: 'info',
    title: '✅ 准备就绪',
    message: '工作空间已设置！',
    detail: `工作空间路径：${store.get('workspacePath')}\n\n提示：请确保在 Chrome 中安装 Viral Shorts Extension 扩展`,
    buttons: ['开始使用'],
  });

  store.set('firstRun', false);
}

module.exports = {
  runFirstTimeSetup,
};
