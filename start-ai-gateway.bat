@echo off
chcp 65001 > nul
echo ==========================================
echo Viral Shorts Engine - AI Gateway 启动脚本
echo ==========================================
echo.

REM 查找 Chrome 安装路径
set CHROME_PATH=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
)

if "%CHROME_PATH%"=="" (
    echo [错误] 未找到 Chrome 浏览器！请手动安装或修改脚本中的路径
    pause
    exit /b 1
)

echo [1/3] 正在启动 Chrome (远程调试模式)...
start "" "%CHROME_PATH%" --remote-debugging-port=9222

echo.
echo [2/3] 等待 3 秒让 Chrome 启动...
timeout /t 3 /nobreak > nul

echo.
echo [3/3] 正在启动 AI Gateway 服务 (端口 4100)...
echo.
cd /d "%~dp0ai-gateway"
npm run dev

echo.
echo AI Gateway 已停止
pause
