#!/bin/bash
# release.sh - 自动更新版本并触发 GitHub Actions 构建

set -e

if [ -z "$1" ]; then
  echo "❌ 错误: 未指定版本号"
  echo "💡 用法: ./release.sh <new_version>"
  echo "📋 示例: ./release.sh 1.0.9"
  echo "   或者: ./release.sh patch  (自动升级小版本，如 1.0.8 -> 1.0.9)"
  echo "   或者: ./release.sh minor  (自动升级中版本，如 1.0.8 -> 1.1.0)"
  exit 1
fi

VERSION=$1

echo "📦 正在更新桌面端版本号..."
cd desktop
# 使用 npm version 更新 package.json 中的版本号，但不自动创建 git tag
npm version $VERSION --no-git-tag-version
cd ..

# 提取更新后的准确版本号 (处理传入 patch/minor 的情况)
NEW_VERSION=$(node -p "require('./desktop/package.json').version")

echo "📝 提交所有代码改动并打标签 (v$NEW_VERSION)..."
git add -A
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "🚀 推送代码到 GitHub 以触发自动构建..."
# 尝试推送到当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin $CURRENT_BRANCH
git push origin "v$NEW_VERSION"

echo ""
echo "✅ 成功！已将版本 v$NEW_VERSION 推送到 GitHub。"
echo "👉 请前往 GitHub 的 Actions 页面查看自动打包进度！"
