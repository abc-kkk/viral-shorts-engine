@echo off
setlocal enabledelayedexpansion

:: release.bat - Auto update version and trigger GitHub Actions build

if not "%~1"=="" goto run_release
echo Error: Version not specified
echo Usage: release.bat ^<new_version^>
echo Example: release.bat 1.0.9
echo    Or: release.bat patch  (auto upgrade patch version, e.g. 1.0.8 -^> 1.0.9)
echo    Or: release.bat minor  (auto upgrade minor version, e.g. 1.0.8 -^> 1.1.0)
exit /b 1

:run_release
set VERSION=%~1

echo Updating desktop version...
cd desktop
call npm version %VERSION% --no-git-tag-version
if errorlevel 1 (
    echo Error updating version
    cd ..
    exit /b 1
)
cd ..

:: Extract the updated version
for /f "delims=" %%i in ('node -p "require('./desktop/package.json').version"') do set NEW_VERSION=%%i

echo Committing changes and creating tag v%NEW_VERSION%...
git add -A
git commit -m "chore: release v%NEW_VERSION%"
git tag "v%NEW_VERSION%"

echo Pushing code to GitHub to trigger build...
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%b
git push origin %CURRENT_BRANCH%
git push origin "v%NEW_VERSION%"

echo.
echo Success! Version v%NEW_VERSION% pushed to GitHub.
