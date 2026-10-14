@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Chạy Kiểm Thử Toàn Diện (smart-ppe-infra)

echo ==============================================================================
echo  🧪 SMART PPE MONITORING - CHẠY BỘ KIỂM THỬ TOÀN DIỆN (E2E TEST)
echo ==============================================================================
echo.

echo [1/1] Đang thực thi kiểm thử tích hợp toàn bộ API qua Gateway & Microservices...
call pnpm --dir ../smart-ppe-identity-service exec tsx ../smart-ppe-infra/scripts/tests/test_all_apis_comprehensive.ts

pause
