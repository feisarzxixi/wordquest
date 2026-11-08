@echo off
chcp 65001 >nul
title WordQuest 英语单词学习系统 V1.0

set PATH=%LOCALAPPDATA%\Programs\nodejs;%~dp0node_modules\.bin;%PATH%

echo ========================================================
echo   WordQuest 英语单词学习系统 V1.0 (中学生无 AI 专属版)
echo ========================================================
echo.
echo 正在启动本地学习服务器...
echo.

start "" "http://localhost:3000"
npm run start
