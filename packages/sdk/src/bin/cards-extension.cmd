@echo off
rem Wrapper script for cards-extension.mjs that resolves the Node.js binary
rem from ~/.cards/VSCODE_NODE (extension-bundled) or falls back to PATH node.
set "NODE_FILE=%USERPROFILE%\.cards\VSCODE_NODE"
if exist "%NODE_FILE%" (
  set /p NODE=<"%NODE_FILE%"
) else (
  set "NODE=node"
)
"%NODE%" "%~dp0cards-extension.mjs" %*
