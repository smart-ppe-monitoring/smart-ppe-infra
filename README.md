# smart-ppe-infra (Smart PPE Monitoring Infrastructure & Orchestration)

> **Trung tâm Điều phối Hạ tầng Dùng chung & API Gateway** cho toàn bộ Hệ thống Giám sát An toàn Lao động Thông minh (**Smart PPE Monitoring Microservices**), chuẩn hóa theo **Tài liệu D08.pdf**.

Tất cả các thao tác: **Tải mã nguồn (Clone)**, **Khởi động hệ thống (1-Click)**, **Điều phối Docker/Node.js**, và **Kiểm thử E2E** đều có thể thực hiện **trực tiếp ngay bên trong thư mục `smart-ppe-infra` này**.

---

## 🏛️ Các Thành Phần Hạ Tầng (Infrastructure Backbone)

| Thành phần | Công nghệ | Cổng (Host Port) | Vai trò |
| :--- | :--- | :---: | :--- |
| **API Gateway** | **Traefik v3.3** | `80`, `8080` (Dashboard) | SSL Termination, Rate Limiting, Request ID injection, Routing tới 7 microservices |
| **Database** | **PostgreSQL 16** | `5433` (mapped 5432) | 6 Logical DBs cô lập (`identity`, `site`, `camera`, `incident`, `notification`, `reporting`) |
| **Event Bus** | **Apache Kafka (KRaft)** | `9092` (host), `29092` (internal) | Event-Driven Backbone cho các sự kiện vi phạm PPE (`ppe.violation.detected`) |
| **Kafka UI** | **Provectus Kafka UI** | `8088` | Giao diện trực quan kiểm tra Topics, Partitions, Consumer Groups |
| **Object Storage**| **MinIO (S3-compatible)**| `9000` (API), `9001` (Console) | Lưu trữ vĩnh viễn hình ảnh snapshot, video clip bằng chứng vi phạm PPE |
| **Cache & Broker**| **Redis 7 Alpine** | `6379` | TTL Cache, Dynamic RBAC cache invalidation, SSE session management |

---

## 🚀 Hướng Dẫn Vận Hành Hệ Thống (Thực hiện trực tiếp tại đây)

### Bước 1: Tải mã nguồn 9 dịch vụ vệ tinh (Dành cho thành viên mới)
Nếu bạn hoặc đồng nghiệp mới clone repo `smart-ppe-infra`, chỉ cần bấm đúp chuột:
👉 **`clone-all.bat`**
*(Script sẽ tự động kéo 9 repositories còn lại về thư mục ngang hàng từ GitHub Organization `smart-ppe-monitoring` nhánh `develop`).*

---

### Bước 2: Khởi Động Toàn Bộ Hệ Thống (1-Click)

Bạn có 2 lựa chọn khởi động:

#### 👉 Lựa chọn 1: Chế độ Lai 1-Click (Khuyên dùng - Siêu nhẹ RAM & Khởi động tức thì)
Bấm đúp chuột vào:
👉 **`start-all.bat`**

- **Cơ chế hoạt động**:
  1. Tự động kiểm tra và khởi động Docker Desktop nếu chưa chạy.
  2. Dựng cụm 6 hạ tầng Docker: PostgreSQL (6 DBs), Redis, Kafka KRaft, Kafka UI, MinIO, Traefik Gateway.
  3. Biên dịch thư viện chia sẻ `@smart-ppe/common`.
  4. Chạy song song 7 microservices backend Node.js (`identity`, `site`, `camera`, `incident`, `media`, `reporting`, `notification`) và hiển thị trạng thái sẵn sàng.
- **Dừng hệ thống**: Bấm đúp **`stop-all.bat`**.

---

#### 👉 Lựa chọn 2: Chạy 100% trong Docker Desktop
Nếu bạn muốn toàn bộ 13 containers (6 hạ tầng + 7 microservices) chạy khép kín trong Docker:
```bash
docker compose up -d --build
```
- **Dừng toàn bộ container**:
  ```bash
  docker compose down
  ```

---

### Bước 3: Chạy Kiểm Thử Toàn Diện Hệ Thống (E2E Test)

Sau khi hệ thống đã khởi động, bấm đúp chuột vào:
👉 **`test-all.bat`**
*(Kịch bản sẽ tự động kiểm tra luồng end-to-end: Đăng nhập Admin, cấp phát quyền RBAC, tạo công trường, tạo zone, thiết lập camera RTSP, đẩy sự kiện vi phạm PPE, upload ảnh chứng cứ lên MinIO, và kiểm tra thông báo thời gian thực).*

---

## 🌐 Danh Mục Cổng Truy Cập & Bảng Điều Khiển Quản Trị

* **API Gateway chính**: [http://localhost:80](http://localhost:80)
* **Traefik Ingress Dashboard**: [http://localhost:8080](http://localhost:8080)
* **Kafka UI Dashboard**: [http://localhost:8088](http://localhost:8088)
* **MinIO Object Console**: [http://localhost:9001](http://localhost:9001) *(User: `minio_admin` / Pass: `minio_admin_secret`)*
* **PostgreSQL Database**: `localhost:5433` *(User: `postgres` / Pass: `postgres_master_dev`)*

---

## 📜 Bản Quyền & Tổ Chức
Đồ án Tốt nghiệp: Hệ thống Giám sát An toàn Lao động Thông minh trên nền tảng Microservices (Chuẩn D08.pdf).  
GitHub Organization: [smart-ppe-monitoring](https://github.com/smart-ppe-monitoring).
