@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Khởi Chạy Toàn Bộ Hệ Thống (Hybrid Mode)

echo ==============================================================================
echo  🚀 SMART PPE MONITORING - KHỞI ĐỘNG HỆ THỐNG CHẾ ĐỘ LAI (HYBRID)
echo ==============================================================================
echo.

call npx -y tsx scripts/start_all_services.ts

pause
