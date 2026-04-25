#!/bin/bash
# =====================================================================
# 一键部署 GitHub Codespace + Cloudflare WARP 纯净美国 IP 代理隧道
# =====================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   🚀 开始一键打造千万级防封工作室纯净 IP 隧道   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. 检查 gh 是否安装
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 GitHub CLI (gh)。${NC}"
    echo "Mac 用户请执行: brew install gh"
    echo "Windows 用户请执行: winget install --id GitHub.cli"
    exit 1
fi

# 2. 检查登录状态
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️ 您尚未登录 GitHub CLI，即将开始授权登录流程...${NC}"
    gh auth login -w -s codespace
fi

# 3. 创建 Codespace
echo -e "\n${GREEN}[1/4] 正在为您免费申请 GitHub 美国云服务器 (Codespace)...${NC}"
echo -e "${YELLOW}(此过程通常需要 1-2 分钟，请耐心等待，切勿关闭窗口)${NC}"

# 自动获取当前登录的 GitHub 用户名
USERNAME=$(gh api user -q ".login")
REPO="$USERNAME/proxy-tunnel"

echo -e "${YELLOW}正在为您在账号 $USERNAME 下初始化隧道环境...${NC}"
# 尝试静默创建空仓库（如果已存在则忽略报错）
gh repo create $REPO --public --add-readme >/dev/null 2>&1 || true
# 使用 gh api 尝试获取默认环境，或者直接用默认配置创建
# 使用 awk 过滤掉进度条输出，提取纯粹的 codespace 名字
CS_NAME=$(gh cs create -R $REPO --machine basicLinux32gb --idle-timeout 120m --status | grep "Name:" | awk '{print $2}')

if [ -z "$CS_NAME" ]; then
    echo -e "${RED}❌ 云服务器申请失败，请检查网络或 GitHub 账户状态。${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 申请成功！您的专属云主机 ID 为: ${CS_NAME}${NC}"

# 4. 等待环境就绪
echo -e "\n${GREEN}[2/4] 正在等待云主机启动并建立 SSH 安全连接...${NC}"
# 给它几秒钟完全启动 SSH 服务
sleep 15

# 5. 在云端一键安装并配置 WARP
echo -e "\n${GREEN}[3/4] 正在云端静默安装 Cloudflare WARP 隐形铠甲...${NC}"
echo -e "${YELLOW}(正在执行底层 APT 依赖安装，大约需要 30 秒，请勿中断)${NC}"

gh cs ssh -c "$CS_NAME" -- "
  sudo apt-get update && \
  curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg && \
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ focal main' | sudo tee /etc/apt/sources.list.d/cloudflare-client.list && \
  sudo apt-get update && \
  sudo apt-get install cloudflare-warp -y && \
  sudo warp-svc --accept-tos > /dev/null 2>&1 & \
  sleep 3 && \
  warp-cli --accept-tos register && \
  warp-cli --accept-tos set-mode proxy && \
  warp-cli --accept-tos set-proxy-port 40000 && \
  warp-cli --accept-tos connect
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ WARP 极客幽灵隧道在云端配置完毕！${NC}"
else
    echo -e "${RED}❌ WARP 安装遇到问题，请重试或前往 GitHub 网页端手动检查。${NC}"
    exit 1
fi

# 6. 把新生成的 ID 更新到原有的 start-proxy.sh 中
echo -e "\n${GREEN}正在将新主机 ID 绑定到本地快速启动脚本 (start-proxy.sh)...${NC}"
sed -i.bak "s/CODESPACE_ID=\${1:-\".*\"}/CODESPACE_ID=\${1:-\"$CS_NAME\"}/g" start-proxy.sh
rm -f start-proxy.sh.bak

# 7. 打通隧道
echo -e "\n${GREEN}[4/4] 正在打通时空隧道，将纯净 IP 牵引至本机...${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}🎉 大功告成！SOCKS5 代理已就在 127.0.0.1:1081${NC}"
echo -e "${YELLOW}⚠️ 警告：看到此消息后，【这个终端黑框框绝对不要关】！！！${NC}"
echo -e "${YELLOW}   关闭它，隧道就会立刻断开！${NC}"
echo -e "${BLUE}======================================================${NC}"
echo "未来如果电脑重启，只需在终端运行: ./start-proxy.sh 即可光速复活！"

gh cs ssh -c "$CS_NAME" -- -N -L 1081:127.0.0.1:40000
