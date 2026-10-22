@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Dừng Toàn Bộ Hệ Thống

echo ==============================================================================
echo  🛑 SMART PPE MONITORING - DỪNG TOÀN BỘ HỆ THỐNG
echo ==============================================================================
echo.

echo [1/2] Đang dừng hạ tầng Docker Compose...
docker compose -f docker-compose.infra.yml down

echo.
echo [2/2] Đang giải phóng các tiến trình Node.js trên các cổng microservices...
for %%P in (9999 8891 8892 8893 8890 8894 8889) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a > nul 2>&1
    )
)

echo.
echo ✅ Toàn bộ hệ thống đã được dừng an toàn.
pause
