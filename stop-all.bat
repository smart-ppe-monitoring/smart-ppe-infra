@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Dừng Toàn Bộ Dịch Vụ (smart-ppe-infra)

echo ==============================================================================
echo  🛑 SMART PPE MONITORING - DỪNG TOÀN BỘ HỆ THỐNG TỪ SMART-PPE-INFRA
echo ==============================================================================
echo.

echo [1/2] Dừng các tiến trình Node.js microservices...
taskkill /F /FI "WINDOWTITLE eq Smart PPE Monitoring*" > nul 2>&1
taskkill /F /IM tsx.cmd > nul 2>&1
taskkill /F /IM node.exe /FI "MEMUSAGE gt 10000" > nul 2>&1
echo [OK] Đã dừng các microservices backend.
echo.

echo [2/2] Dừng các container Docker hạ tầng & dịch vụ...
docker compose -f docker-compose.infra.yml stop > nul 2>&1
docker compose stop > nul 2>&1
echo [OK] Đã tạm dừng toàn bộ container Docker.
echo.
echo ==============================================================================
echo  ✅ HỆ THỐNG ĐÃ ĐƯỢC DỪNG AN TOÀN!
echo ==============================================================================
timeout /t 5
