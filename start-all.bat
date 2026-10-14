@echo off
chcp 65001 > nul
title Smart PPE Monitoring - Khởi Động Hệ Thống (Từ smart-ppe-infra)

echo ==============================================================================
echo  🚀 SMART PPE MONITORING - KHỞI ĐỘNG HỆ THỐNG TỪ SMART-PPE-INFRA (1-CLICK)
echo ==============================================================================
echo.

:: 1. Kiểm tra Docker Desktop
echo [1/4] Kiểm tra trạng thái Docker Desktop...
docker ps > nul 2>&1
if %errorlevel% neq 0 (
    echo [Docker] Docker Desktop chưa chạy. Đang tự động mở Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [Docker] Vui lòng đợi Docker Desktop khởi động hoàn tất (khoảng 15-30s)...
    :check_docker
    timeout /t 5 /nobreak > nul
    docker ps > nul 2>&1
    if %errorlevel% neq 0 (
        echo [Docker] Vẫn đang chờ Docker Engine sẵn sàng...
        goto check_docker
    )
    echo [Docker] Docker Desktop đã sẵn sàng!
) else (
    echo [Docker] Docker Desktop đang hoạt động tốt.
)
echo.

:: 2. Khởi động hạ tầng Docker (Postgres 6 DBs, Kafka KRaft, MinIO, Redis, Traefik v3)
echo [2/4] Khởi động hạ tầng Docker (PostgreSQL 6 DBs, Redis, Kafka, MinIO, Traefik)...
docker compose -f docker-compose.infra.yml up -d
echo.

:: 3. Biên dịch thư viện dùng chung @smart-ppe/common
echo [3/4] Cập nhật thư viện hợp đồng chia sẻ (@smart-ppe/common)...
call pnpm --dir ../smart-ppe-shared-contracts build
echo.

:: 4. Khởi động đồng loạt 7 microservices backend Node.js
echo [4/4] Khởi động toàn bộ 7 Microservices Backend...
call pnpm --dir ../smart-ppe-identity-service exec tsx scripts/start_all_services.ts

pause
