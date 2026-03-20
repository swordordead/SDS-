@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title SDS 自动生成工具

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     SDS 自动生成工具 - 启动脚本       ║
echo  ╚══════════════════════════════════════╝
echo.

set PORT=3100

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo  下载地址：https://nodejs.org/
    pause
    exit /b 1
)

:: 检查并安装根依赖
if not exist "node_modules" (
    echo  [1/3] 安装服务端依赖（首次约需 3-5 分钟）...
    call npm install
    if %errorlevel% neq 0 (
        echo  [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

:: 检查并构建前端
if not exist "server\public\index.html" (
    echo  [2/3] 安装前端依赖并构建...
    cd client
    if not exist "node_modules" (
        call npm install --legacy-peer-deps
    )
    call npx vite build
    if %errorlevel% neq 0 (
        echo  [错误] 前端构建失败
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo  [2/3] 前端已构建，跳过...
)

:: 检查端口
echo  [3/3] 检查端口 %PORT%...
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  端口 %PORT% 已被占用，选择操作：
    echo  [1] 终止占用进程并继续
    echo  [2] 使用端口 3200
    echo  [3] 退出
    echo.
    set /p choice="请输入选项 (1/2/3): "
    if "!choice!"=="1" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
            taskkill /PID %%a /F >nul 2>&1
        )
        echo  已终止占用进程
    ) else if "!choice!"=="2" (
        set PORT=3200
    ) else (
        exit /b 0
    )
)

:: 读取 .env 文件
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
    )
)

echo.
echo  正在启动 SDS 工具服务...
echo  地址：http://localhost:%PORT%
echo.

:: 延迟后打开浏览器
start "" cmd /c "ping -n 4 127.0.0.1 >nul & start http://localhost:%PORT%"

:: 启动服务
set PORT=%PORT%
node server/app.js

pause
