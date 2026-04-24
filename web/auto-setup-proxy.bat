@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: =====================================================================
:: 一键部署 GitHub Codespace + Cloudflare WARP 纯净美国 IP 代理隧道 (Windows)
:: =====================================================================

echo ======================================================
echo    🚀 开始一键打造千万级防封工作室纯净 IP 隧道   
echo ======================================================

:: 1. 检查 gh 是否安装
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 GitHub CLI ^(gh^)。
    echo Windows 用户请右键开始菜单打开 PowerShell，执行: winget install --id GitHub.cli
    pause
    exit /b 1
)

:: 2. 检查登录状态
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ 您尚未登录 GitHub CLI，即将开始授权登录流程...
    gh auth login -w
)

:: 3. 创建 Codespace
echo.
echo [1/4] 正在为您免费申请 GitHub 美国云服务器 (Codespace)...
echo (此过程通常需要 1-2 分钟，请耐心等待，切勿关闭窗口)

set REPO=abc-kkk/viral-shorts-engine
set CS_NAME=

:: 获取新建的 Codespace ID
for /f "tokens=2" %%A in ('gh cs create -R %REPO% --idle-timeout 120m --status ^| findstr "Name:"') do (
    set CS_NAME=%%A
)

if "%CS_NAME%"=="" (
    echo ❌ 云服务器申请失败，请检查网络或 GitHub 账户状态。
    pause
    exit /b 1
)

echo ✅ 申请成功！您的专属云主机 ID 为: %CS_NAME%

:: 4. 等待环境就绪
echo.
echo [2/4] 正在等待云主机启动并建立 SSH 安全连接...
timeout /t 15 /nobreak >nul

:: 5. 安装 WARP
echo.
echo [3/4] 正在云端静默安装 Cloudflare WARP 隐形铠甲...
echo (正在执行底层 APT 依赖安装，大约需要 30 秒，请勿中断)

gh cs ssh -c "%CS_NAME%" -- "sudo apt-get update && curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg && echo 'deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ focal main' | sudo tee /etc/apt/sources.list.d/cloudflare-client.list && sudo apt-get update && sudo apt-get install cloudflare-warp -y && sudo warp-svc --accept-tos > /dev/null 2>&1 & sleep 3 && warp-cli --accept-tos register && warp-cli --accept-tos set-mode proxy && warp-cli --accept-tos set-proxy-port 40000 && warp-cli --accept-tos connect"

if %errorlevel% equ 0 (
    echo ✅ WARP 极客幽灵隧道在云端配置完毕！
) else (
    echo ❌ WARP 安装遇到问题，请重试或前往 GitHub 网页端手动检查。
    pause
    exit /b 1
)

:: 6. 更新 start-proxy.bat 和 start-proxy.sh 中的 ID
echo.
echo 正在将新主机 ID 绑定到本地快速启动脚本...
if exist start-proxy.bat (
    powershell -Command "(gc start-proxy.bat) -replace 'set CODESPACE_ID=.*', 'set CODESPACE_ID=%CS_NAME%' | Out-File -encoding utf8 start-proxy.bat"
)
if exist start-proxy.sh (
    powershell -Command "(gc start-proxy.sh) -replace 'CODESPACE_ID=\$\{1:-''.*''\}', 'CODESPACE_ID=\$\{1:-''%CS_NAME%''\}' | Out-File -encoding utf8 start-proxy.sh"
)

:: 7. 打通隧道
echo.
echo [4/4] 正在打通时空隧道，将纯净 IP 牵引至本机...
echo ======================================================
echo 🎉 大功告成！SOCKS5 代理已就在 127.0.0.1:1081
echo ⚠️ 警告：看到此消息后，【这个黑色终端窗口绝对不要关】！！！
echo    关闭它，隧道就会立刻断开！
echo ======================================================
echo 未来如果电脑重启，只需双击运行 start-proxy.bat 即可光速复活！

gh cs ssh -c "%CS_NAME%" -- -N -L 1081:127.0.0.1:40000
