import { spawn, execSync, ChildProcess } from "child_process";
import path from "path";
import http from "http";
import net from "net";
import fs from "fs";

interface ServiceDef {
  name: string;
  dir: string;
  port: number;
  healthPath: string;
}

const SERVICES: ServiceDef[] = [
  { name: "IDENTITY", dir: "smart-ppe-identity-service", port: 9999, healthPath: "/api/v1/health" },
  { name: "NOTIFICATION", dir: "smart-ppe-notification-service", port: 8889, healthPath: "/health" },
  { name: "MEDIA", dir: "smart-ppe-media-service", port: 8890, healthPath: "/health" },
  { name: "SITE", dir: "smart-ppe-site-service", port: 8891, healthPath: "/health" },
  { name: "CAMERA", dir: "smart-ppe-camera-service", port: 8892, healthPath: "/health" },
  { name: "INCIDENT", dir: "smart-ppe-incident-service", port: 8893, healthPath: "/health" },
  { name: "REPORTING", dir: "smart-ppe-reporting-service", port: 8894, healthPath: "/health" },
];

const children: { name: string; proc: ChildProcess }[] = [];

// Tự động nhận diện thư mục root workspace (dù chạy từ smart-ppe-infra hay từ ngoài)
const infraDir = fs.existsSync(path.resolve(process.cwd(), "docker-compose.infra.yml"))
  ? process.cwd()
  : path.resolve(process.cwd(), "smart-ppe-infra");

const workspaceRoot = fs.existsSync(path.resolve(process.cwd(), "smart-ppe-identity-service"))
  ? process.cwd()
  : path.resolve(infraDir, "..");

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function ensureInfra(): Promise<void> {
  console.log("[ORCHESTRATOR] Kiểm tra hạ tầng cơ sở dữ liệu (PostgreSQL :5433)...");
  const isPostgresUp = await checkPort(5433);
  if (!isPostgresUp) {
    console.log("[ORCHESTRATOR] PostgreSQL chưa chạy. Đang tự động kích hoạt Docker Compose infra...");
    try {
      execSync("docker compose -f docker-compose.infra.yml up -d", {
        cwd: infraDir,
        stdio: "inherit",
      });
      console.log("[ORCHESTRATOR] Chờ PostgreSQL sẵn sàng kết nối...");
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (await checkPort(5433)) {
          console.log("[ORCHESTRATOR] ✅ PostgreSQL :5433 đã kết nối thành công!");
          break;
        }
      }
    } catch (err: any) {
      console.warn("[ORCHESTRATOR WARN] Không thể tự động chạy docker compose infra:", err?.message || err);
    }
  } else {
    console.log("[ORCHESTRATOR] ✅ Hạ tầng PostgreSQL :5433 đã sẵn sàng.");
  }

  // Đảm bảo @smart-ppe/common đã được build
  try {
    const contractsDir = path.resolve(workspaceRoot, "smart-ppe-shared-contracts");
    execSync("pnpm build", { cwd: contractsDir, stdio: "ignore" });
    console.log("[ORCHESTRATOR] ✅ Thư viện @smart-ppe/common đã sẵn sàng.");
  } catch {}
}

function checkHealth(port: number, healthPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port,
        path: healthPath,
        method: "GET",
        timeout: 2000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function startAll() {
  console.log("==============================================================================");
  console.log("  🚀 SMART PPE MONITORING - KHỞI CHẠY 7 MICROSERVICES SONG SONG");
  console.log("==============================================================================");
  console.log(`[ORCHESTRATOR] Thư mục gốc Workspace: ${workspaceRoot}`);
  console.log(`[ORCHESTRATOR] Thư mục Hạ tầng Infra: ${infraDir}\n`);

  await ensureInfra();

  console.log("\n[ORCHESTRATOR] Đang khởi động đồng thời 7 microservices...");

  for (const svc of SERVICES) {
    const svcDir = path.resolve(workspaceRoot, svc.dir);

    // Chạy pnpm dev trong từng service
    const proc = spawn("cmd.exe", ["/c", "pnpm", "dev"], {
      cwd: svcDir,
      stdio: "pipe",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    children.push({ name: svc.name, proc });

    proc.stdout?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line) {
        console.log(`[${svc.name}] ${line}`);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line && !line.includes("ExperimentalWarning")) {
        console.error(`[${svc.name} ERR] ${line}`);
      }
    });

    proc.on("close", (code) => {
      console.log(`[${svc.name}] Đã dừng với mã thoát ${code}`);
    });
  }

  console.log("\n[ORCHESTRATOR] Đang đợi tất cả 7 dịch vụ hoàn tất khởi động (Healthcheck)...");

  const startTime = Date.now();
  const maxWaitMs = 60000;
  const readyMap = new Map<string, boolean>();

  while (Date.now() - startTime < maxWaitMs) {
    let allReady = true;
    for (const svc of SERVICES) {
      if (readyMap.get(svc.name)) continue;
      const isUp = await checkHealth(svc.port, svc.healthPath);
      if (isUp) {
        readyMap.set(svc.name, true);
        console.log(`[ORCHESTRATOR]  ✨ ${svc.name.padEnd(12)} (Port :${svc.port}) -> SẴN SÀNG!`);
      } else {
        allReady = false;
      }
    }

    if (allReady) {
      console.log("\n==============================================================================");
      console.log("  🎉 TẤT CẢ 7 MICROSERVICES VÀ HẠ TẦNG ĐÃ SẴN SÀNG 100%!");
      console.log("==============================================================================");
      console.log("  • API Gateway (Traefik):    http://localhost:80");
      console.log("  • Traefik Dashboard:        http://localhost:8080");
      console.log("  • Identity Service:         http://localhost:9999");
      console.log("  • Site Service:             http://localhost:8891");
      console.log("  • Camera Service:           http://localhost:8892");
      console.log("  • Incident Service:         http://localhost:8893");
      console.log("  • Media Service:            http://localhost:8890");
      console.log("  • Reporting Service:        http://localhost:8894");
      console.log("  • Notification Service:     http://localhost:8889");
      console.log("  • Kafka UI Console:         http://localhost:8088");
      console.log("  • MinIO Console:            http://localhost:9001");
      console.log("==============================================================================");
      console.log("Nhấn Ctrl + C để dừng toàn bộ dịch vụ.\n");
      break;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}

// Bắt sự kiện tắt an toàn (Graceful Shutdown)
function cleanup() {
  console.log("\n[ORCHESTRATOR] Đang dừng tất cả các microservices...");
  for (const { name, proc } of children) {
    try {
      if (proc.pid) {
        execSync(`taskkill /pid ${proc.pid} /t /f > nul 2>&1`);
      }
    } catch {}
  }
  console.log("[ORCHESTRATOR] Đã dừng tất cả các dịch vụ an toàn.");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

startAll().catch((err) => {
  console.error("[ORCHESTRATOR FATAL ERROR]:", err);
  cleanup();
});
