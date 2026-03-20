@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SDS 开发模式

echo.
echo  SDS 开发模式 — 前后端热更新
echo.

:: 启动后端（新窗口）
start "SDS Server" cmd /k "cd /d %~dp0 && node server/app.js"

:: 等待后端启动
ping -n 3 127.0.0.1 >nul

:: 启动前端 Vite dev server
cd client
if not exist "node_modules" (
    echo 安装前端依赖...
    call npm install
)
call npx vite --host

pause
