@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Clone 9 Microservices (Từ smart-ppe-infra)

echo ==============================================================================
echo  🚀 SMART PPE MONITORING - TỰ ĐỘNG TẢI 9 REPOSITORIES CÒN LẠI (NHÁNH DEVELOP)
echo ==============================================================================
echo.

:: 1. Kiểm tra Git
git --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính chưa cài đặt Git! Vui lòng cài Git trước.
    pause
    exit /b 1
)

set ORG=https://github.com/smart-ppe-monitoring
set BRANCH=develop

set REPOS=smart-ppe-identity-service smart-ppe-site-service smart-ppe-camera-service smart-ppe-incident-service smart-ppe-media-service smart-ppe-reporting-service smart-ppe-notification-service smart-ppe-ai-service smart-ppe-shared-contracts

pushd ..
for %%R in (%REPOS%) do (
    if exist %%R (
        echo [Bỏ qua] Thư mục %%R đã tồn tại. Đang cập nhật branch %BRANCH%...
        pushd %%R
        git checkout %BRANCH% > nul 2>&1
        git pull origin %BRANCH%
        popd
    ) else (
        echo [Đang tải] %%R từ %ORG%/%%R.git...
        git clone -b %BRANCH% %ORG%/%%R.git
    )
    echo.
)
popd

echo ==============================================================================
echo  ✅ ĐÃ TẢI XONG ĐẦY ĐỦ 10 REPOSITORIES!
echo ==============================================================================
echo.
echo Bạn có thể chạy ngay từ trong smart-ppe-infra:
echo   • Bấm đúp 'start-all.bat' để khởi động hệ thống (Chế độ lai - Siêu nhẹ RAM).
echo   • Hoặc chạy 'docker compose up -d' để chạy 100%% trong Docker.
echo.
pause
