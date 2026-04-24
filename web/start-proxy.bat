@echo off
chcp 65001 >nul
setlocal

:: =====================================================================
:: Google Flow AI 自动化专用过流控通道启动脚本 (Windows)
:: 作者：系统生成
:: 用法：直接双击运行 start-proxy.bat
:: =====================================================================

:: 默认使用您当前活跃的 Codespace ID
set CODESPACE_ID=cautious-space-adventure-qwjj6x6w7442x66
if not "%~1"=="" set CODESPACE_ID=%~1
set LOCAL_PORT=1081
set REMOTE_PORT=40000

echo ==========================================================
echo 🚀 开始为您建立 Cloudflare WARP 极客幽灵隧道...
echo 🔹 目标 Codespace: %CODESPACE_ID%

echo 🔮 [1/3] 正在云端施肥...拉起离线存活进程 (warp-svc)...
gh cs ssh -c %CODESPACE_ID% -- "sudo bash -c 'nohup warp-svc --accept-tos > /dev/null 2>&1 &'"

timeout /t 2 /nobreak >nul

echo 🌐 [2/3] 正在云端强制洗牌并连入 Cloudflare 获取全新 IP...
gh cs ssh -c %CODESPACE_ID% -- "warp-cli --accept-tos disconnect; sleep 1; warp-cli --accept-tos connect"

echo ✅ 云端环境就绪！网络已伪装！

echo 🌉 [3/3] 正在建立本地引流桥梁 (Windows 127.0.0.1:%LOCAL_PORT% -^> ☁️ WARP)
echo ==========================================================
echo 🎯 SOCKS5 代理已就在 127.0.0.1:%LOCAL_PORT%
echo 🟢 随时可以执行 npm run dev 跑项目啦！
echo.
echo ⚠️  注意：看到这条消息后，【这个黑色终端窗口绝对不要关】！！！
echo 若要结束代理，请直接关闭本窗口或按 Ctrl+C
echo ==========================================================

gh cs ssh -c %CODESPACE_ID% -- -N -L %LOCAL_PORT%:127.0.0.1:%REMOTE_PORT%
