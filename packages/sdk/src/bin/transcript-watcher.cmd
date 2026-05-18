@echo off
REM Wrapper script for transcript-watcher.mjs that resolves the Node.js binary
REM from %USERPROFILE%\.cards\VSCODE_NODE (extension-bundled) or falls back to PATH node.
REM
REM Generated as a build artifact by claude-code-hooks-api.
setlocal
set "NODE=node"
if exist "%USERPROFILE%\.cards\VSCODE_NODE" (
  for /f "usebackq delims=" %%I in ("%USERPROFILE%\.cards\VSCODE_NODE") do set "NODE=%%I"
)
"%NODE%" "%~dp0transcript-watcher.mjs" %*
exit /b %ERRORLEVEL%
