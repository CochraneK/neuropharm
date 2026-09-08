@echo off
REM ============================================================
REM  NeuroPharm - Publish to GitHub (Pages + APK Release)
REM  Prereqs (run on YOUR machine, not the sandbox):
REM    1. Install git + GitHub CLI: https://cli.github.com/
REM    2. Log in once:  gh auth login   (browser OAuth, GitHub.com)
REM  Then run this script ONCE from the repo root.
REM ============================================================
setlocal
set "REPO=neuropharm"

REM Detect GitHub username from the logged-in account
for /f "tokens=*" %%i in ('gh api user --jq .login 2^>nul') do set "USERNAME=%%i"
if not defined USERNAME (
  echo [ERROR] GitHub login not found. Run: gh auth login
  pause
  exit /b 1
)
echo GitHub username: %USERNAME%

REM 1) Create public repo and push current branch (adds origin remote)
echo [1/3] Creating public repo and pushing main...
gh repo create %REPO% --public --source=. --push --description "NeuroPharm psychopharm learning app"

REM 2) Enable GitHub Pages (Actions deployment)
echo [2/3] Enabling GitHub Pages (Actions)...
gh api -X POST /repos/%USERNAME%/%REPO%/pages -f build_type=workflow >nul 2>&1
if errorlevel 1 (
  echo   [NOTE] API enable failed (token lacks 'pages' scope).
  echo   Please enable manually: Settings - Pages - Source: GitHub Actions - Save.
) else (
  echo   Pages enabled. Re-triggering first deploy...
  git commit --allow-empty -m "trigger pages deploy" >nul 2>&1
  git push >nul 2>&1
)

REM 3) Tag to trigger cloud APK build and publish to Releases
echo [3/3] Tagging v0.1.0 to build APK Release...
git tag v0.1.0
git push origin v0.1.0

echo.
echo ===== Done. Wait a few minutes for Actions to finish. =====
echo   Pages site : https://%USERNAME%.github.io/%REPO%/
echo   APK Release: https://github.com/%USERNAME%/%REPO%/releases
echo   If you enabled Pages manually above, re-run the
echo   "Deploy to GitHub Pages" workflow from the Actions tab.
pause
