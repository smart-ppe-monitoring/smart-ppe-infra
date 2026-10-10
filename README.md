# smart-ppe-infra (Smart PPE Infrastructure & API Gateway)

> **Cụm Hạ tầng Dùng chung & API Gateway** cho Hệ thống Giám sát An toàn Lao động Thông minh (**Smart PPE Monitoring Microservices**), chuẩn hóa theo **Tài liệu D08.pdf**.

---

## 🏛️ Các thành phần hạ tầng (Infrastructure Components)

| Thành phần | Công nghệ | Cổng (Host Port) | Vai trò |
| :--- | :--- | :---: | :--- |
| **API Gateway** | **Traefik v3.3** | `80`, `443`, `8080` (Dashboard) | SSL Termination, Rate Limiting, Request ID injection, Secret verification |
| **Database** | **PostgreSQL 16** | `5433` (mapped 5432) | 6 Logical DBs cô lập (`identity`, `site`, `camera`, `incident`, `notification`, `reporting`) |
| **Event Bus** | **Apache Kafka (KRaft)** | `9092` (host), `29092` (internal) | Event-Driven Backbone cho các sự kiện vi phạm PPE (`ppe.violation.detected`) |
| **Kafka UI** | **Provectus Kafka UI** | `8088` | Giao diện trực quan kiểm tra Topics, Partitions, Consumer Groups |
| **Object Storage**| **MinIO (S3-compatible)**| `9000` (API), `9001` (Console) | Lưu trữ vĩnh viễn hình ảnh snapshot, video clip bằng chứng vi phạm PPE |
| **Cache & Broker**| **Redis 7 Alpine** | `6379` (internal) | TTL Cache, Dynamic RBAC cache invalidation, SSE session management |

---

## 🚀 Hướng dẫn khởi động (Quick Start)

### 1. Chuẩn bị biến môi trường
Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

### 2. Khởi động Cụm Hạ tầng (Postgres, Kafka, MinIO, Redis)
```bash
docker compose -f docker-compose.infra.yml up -d
```
*Lưu ý: Trong lần chạy đầu tiên, PostgreSQL sẽ tự động thực thi script `scripts/init-multiple-dbs.sql` để tạo 6 Logical Databases và cấp quyền riêng biệt cho từng service.*

### 3. Kiểm tra trạng thái các dịch vụ
```bash
docker compose -f docker-compose.infra.yml ps
```

### 4. Truy cập các bảng điều khiển quản trị
* **Traefik Dashboard**: [http://localhost:8080](http://localhost:8080)
* **Kafka UI Console**: [http://localhost:8088](http://localhost:8088)
* **MinIO Console**: [http://localhost:9001](http://localhost:9001) *(User: `minio_admin` / Pass: `minio_admin_secret`)*

---

## 🛑 Dừng và Dọn dẹp hạ tầng

* **Dừng các container**:
  ```bash
  docker compose -f docker-compose.infra.yml down
  ```
* **Xóa toàn bộ volumes dữ liệu (Làm mới hoàn toàn)**:
  ```bash
  docker compose -f docker-compose.infra.yml down -v
  ```

---

## 📜 Giấy phép & Bản quyền
Đồ án Tốt nghiệp: Hệ thống Giám sát An toàn Lao động Thông minh trên nền tảng Microservices (Chuẩn D08.pdf).
Tổ chức GitHub: [smart-ppe-monitoring](https://github.com/smart-ppe-monitoring).
