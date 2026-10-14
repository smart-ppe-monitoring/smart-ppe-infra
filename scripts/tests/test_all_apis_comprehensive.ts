import http from "http";

interface TestResult {
  step: string;
  service: string;
  status: "PASS" | "FAIL";
  httpCode?: number;
  snippet?: string;
  error?: string;
}

const results: TestResult[] = [];
let adminToken: string = "";

function request(
  port: number,
  path: string,
  method: string = "GET",
  postData?: any,
  token?: string,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const dataString = postData ? JSON.stringify(postData) : undefined;
    const headers: http.OutgoingHttpHeaders = {
      Accept: "application/json",
    };

    if (dataString) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(dataString);
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: "localhost",
        port,
        path,
        method,
        headers,
        timeout: 6000,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: responseBody,
          });
        });
      },
    );

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out after 6000ms"));
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
}

function recordResult(step: string, service: string, status: "PASS" | "FAIL", httpCode?: number, snippet?: string, error?: string) {
  results.push({ step, service, status, httpCode, snippet, error });
  const icon = status === "PASS" ? "✅" : "❌";
  const codeStr = httpCode ? `[HTTP ${httpCode}]` : "";
  const info = snippet ? `-> ${snippet.slice(0, 95)}...` : error || "";
  console.log(`${icon} [${service}] ${step} ${codeStr} ${info}`);
}

async function runComprehensiveTests() {
  console.log("==========================================================================================");
  console.log("🚀 STARTING COMPREHENSIVE END-TO-END MICROSERVICES API TEST ON REAL DATA");
  console.log("==========================================================================================\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. HEALTH CHECKS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- 1. HEALTH CHECKS (ALL 7 MICROSERVICES) ---");
  const healthEndpoints = [
    { name: "Identity Service", port: 9999, path: "/api/v1/health" },
    { name: "Notification Service", port: 8889, path: "/health" },
    { name: "Media Service", port: 8890, path: "/health" },
    { name: "Site Service", port: 8891, path: "/health" },
    { name: "Camera Service", port: 8892, path: "/health" },
    { name: "Incident Service", port: 8893, path: "/health" },
    { name: "Reporting Service", port: 8894, path: "/health" },
  ];

  for (const h of healthEndpoints) {
    try {
      const res = await request(h.port, h.path);
      if (res.statusCode === 200) {
        recordResult(`Health Check (${h.path})`, h.name, "PASS", res.statusCode, res.body);
      } else {
        recordResult(`Health Check (${h.path})`, h.name, "FAIL", res.statusCode, res.body);
      }
    } catch (err: any) {
      recordResult(`Health Check (${h.path})`, h.name, "FAIL", undefined, undefined, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. IDENTITY SERVICE APIS (:9999)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 2. IDENTITY SERVICE APIS (:9999) ---");
  try {
    // 2.1 Login Admin
    const loginRes = await request(9999, "/api/v1/auth/login", "POST", {
      email: "admin@template.local",
      password: "Admin@123456",
    });
    if (loginRes.statusCode === 200) {
      const parsed = JSON.parse(loginRes.body);
      adminToken = parsed.data?.accessToken || parsed.accessToken;
      recordResult("Login as Admin", "Identity Service", "PASS", loginRes.statusCode, `Token length: ${adminToken?.length}`);
    } else {
      recordResult("Login as Admin", "Identity Service", "FAIL", loginRes.statusCode, loginRes.body);
    }

    // 2.2 Profile Me
    const meRes = await request(9999, "/api/v1/auth/me", "GET", undefined, adminToken);
    recordResult("Get Profile (/api/v1/auth/me)", "Identity Service", meRes.statusCode === 200 ? "PASS" : "FAIL", meRes.statusCode, meRes.body);

    // 2.3 JWKS Public Keys
    const jwksRes = await request(9999, "/.well-known/jwks.json");
    recordResult("RFC 7517 JWKS (/.well-known/jwks.json)", "Identity Service", jwksRes.statusCode === 200 ? "PASS" : "FAIL", jwksRes.statusCode, jwksRes.body);

    // 2.4 RFC 9116 Security.txt
    const secRes = await request(9999, "/.well-known/security.txt");
    recordResult("RFC 9116 Security TXT (/.well-known/security.txt)", "Identity Service", secRes.statusCode === 200 ? "PASS" : "FAIL", secRes.statusCode, secRes.body);

    // 2.5 List Users
    const usersRes = await request(9999, "/api/v1/users", "GET", undefined, adminToken);
    recordResult("List Users (/api/v1/users)", "Identity Service", usersRes.statusCode === 200 ? "PASS" : "FAIL", usersRes.statusCode, usersRes.body);

    // 2.6 List Roles
    const rolesRes = await request(9999, "/api/v1/rbac/roles", "GET", undefined, adminToken);
    recordResult("List Roles (/api/v1/rbac/roles)", "Identity Service", rolesRes.statusCode === 200 ? "PASS" : "FAIL", rolesRes.statusCode, rolesRes.body);

    // 2.7 List Permissions
    const permsRes = await request(9999, "/api/v1/rbac/permissions", "GET", undefined, adminToken);
    recordResult("List Permissions (/api/v1/rbac/permissions)", "Identity Service", permsRes.statusCode === 200 ? "PASS" : "FAIL", permsRes.statusCode, permsRes.body);

    // 2.8 List Audit Logs
    const auditRes = await request(9999, "/api/v1/audit-logs", "GET", undefined, adminToken);
    recordResult("List Audit Logs (/api/v1/audit-logs)", "Identity Service", auditRes.statusCode === 200 ? "PASS" : "FAIL", auditRes.statusCode, auditRes.body);

    // 2.9 System Configs
    const configRes = await request(9999, "/api/v1/system/configs", "GET", undefined, adminToken);
    recordResult("System Configs (/api/v1/system/configs)", "Identity Service", configRes.statusCode === 200 ? "PASS" : "FAIL", configRes.statusCode, configRes.body);

    // 2.10 Public Maintenance Status
    const maintPubRes = await request(9999, "/api/v1/maintenance/public", "GET");
    recordResult("Public Maintenance (/api/v1/maintenance/public)", "Identity Service", maintPubRes.statusCode === 200 ? "PASS" : "FAIL", maintPubRes.statusCode, maintPubRes.body);

    // 2.11 Protected Admin Maintenance Status
    const maintAdminRes = await request(9999, "/api/v1/maintenance/status", "GET", undefined, adminToken);
    recordResult("Admin Maintenance Status (/api/v1/maintenance/status)", "Identity Service", maintAdminRes.statusCode === 200 ? "PASS" : "FAIL", maintAdminRes.statusCode, maintAdminRes.body);
  } catch (err: any) {
    recordResult("Identity Service Workflow", "Identity Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SITE SERVICE APIS (:8891)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 3. SITE SERVICE APIS (:8891) ---");
  let createdSiteId: string = "";
  let createdZoneId: string = "";

  try {
    // 3.1 List Sites
    const sitesRes = await request(8891, "/api/v1/sites", "GET", undefined, adminToken);
    recordResult("List Sites (/api/v1/sites)", "Site Service", sitesRes.statusCode === 200 ? "PASS" : "FAIL", sitesRes.statusCode, sitesRes.body);

    // 3.2 Create New Test Site on Real DB
    const randomCode = `ST_${Date.now().toString().slice(-6)}`;
    const createSiteRes = await request(
      8891,
      "/api/v1/sites",
      "POST",
      {
        name: `Automated Test Site ${randomCode}`,
        code: randomCode,
        address: "123 Construction Boulevard, District 7",
        description: "Created automatically during end-to-end integration validation",
      },
      adminToken,
    );
    if (createSiteRes.statusCode === 201 || createSiteRes.statusCode === 200) {
      const parsed = JSON.parse(createSiteRes.body);
      createdSiteId = parsed.data?.id;
      recordResult("Create Site (POST /api/v1/sites)", "Site Service", "PASS", createSiteRes.statusCode, `Created site ID: ${createdSiteId}`);
    } else {
      recordResult("Create Site (POST /api/v1/sites)", "Site Service", "FAIL", createSiteRes.statusCode, createSiteRes.body);
    }

    // 3.3 Get Created Site by ID
    if (createdSiteId) {
      const getSiteRes = await request(8891, `/api/v1/sites/${createdSiteId}`, "GET", undefined, adminToken);
      recordResult(`Get Site by ID (/api/v1/sites/${createdSiteId})`, "Site Service", getSiteRes.statusCode === 200 ? "PASS" : "FAIL", getSiteRes.statusCode, getSiteRes.body);
    }

    // 3.4 List Zones
    const zonesRes = await request(8891, "/api/v1/zones", "GET", undefined, adminToken);
    recordResult("List Zones (/api/v1/zones)", "Site Service", zonesRes.statusCode === 200 ? "PASS" : "FAIL", zonesRes.statusCode, zonesRes.body);

    // 3.5 Create Zone for the Created Site
    if (createdSiteId) {
      const zoneCode = `ZN_${Date.now().toString().slice(-4)}`;
      const createZoneRes = await request(
        8891,
        "/api/v1/zones",
        "POST",
        {
          siteId: createdSiteId,
          name: `Loading Dock ${zoneCode}`,
          code: zoneCode,
          description: "High traffic heavy vehicle zone",
        },
        adminToken,
      );
      if (createZoneRes.statusCode === 201 || createZoneRes.statusCode === 200) {
        const parsed = JSON.parse(createZoneRes.body);
        createdZoneId = parsed.data?.id;
        recordResult("Create Zone (POST /api/v1/zones)", "Site Service", "PASS", createZoneRes.statusCode, `Created zone ID: ${createdZoneId}`);
      } else {
        recordResult("Create Zone (POST /api/v1/zones)", "Site Service", "FAIL", createZoneRes.statusCode, createZoneRes.body);
      }
    }

    // 3.6 List Restricted Areas
    const restrictedRes = await request(8891, "/api/v1/restricted-areas", "GET", undefined, adminToken);
    recordResult("List Restricted Areas (/api/v1/restricted-areas)", "Site Service", restrictedRes.statusCode === 200 ? "PASS" : "FAIL", restrictedRes.statusCode, restrictedRes.body);

    // 3.7 Safety Rules System Default
    const safetyRulesRes = await request(8891, "/api/v1/safety-rules/system-default", "GET", undefined, adminToken);
    recordResult("Safety Rules System Default (/api/v1/safety-rules/system-default)", "Site Service", safetyRulesRes.statusCode === 200 ? "PASS" : "FAIL", safetyRulesRes.statusCode, safetyRulesRes.body);
  } catch (err: any) {
    recordResult("Site Service Workflow", "Site Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CAMERA SERVICE APIS (:8892)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 4. CAMERA SERVICE APIS (:8892) ---");
  let createdCameraId: string = "";

  try {
    // 4.1 List Cameras
    const camListRes = await request(8892, "/api/v1/cameras", "GET", undefined, adminToken);
    recordResult("List Cameras (/api/v1/cameras)", "Camera Service", camListRes.statusCode === 200 ? "PASS" : "FAIL", camListRes.statusCode, camListRes.body);

    // 4.2 Create Camera linked to the Created Site
    if (createdSiteId) {
      const camCode = `CAM_${Date.now().toString().slice(-4)}`;
      const createCamRes = await request(
        8892,
        "/api/v1/cameras",
        "POST",
        {
          siteId: createdSiteId,
          zoneId: createdZoneId || null,
          name: `Front Gate Camera ${camCode}`,
          code: camCode,
          streamUrl: "rtsp://192.168.1.100:554/live/ch0",
          sourceType: "RTSP",
        },
        adminToken,
      );
      if (createCamRes.statusCode === 201 || createCamRes.statusCode === 200) {
        const parsed = JSON.parse(createCamRes.body);
        createdCameraId = parsed.data?.id;
        recordResult("Create Camera (POST /api/v1/cameras)", "Camera Service", "PASS", createCamRes.statusCode, `Created camera ID: ${createdCameraId}`);
      } else {
        recordResult("Create Camera (POST /api/v1/cameras)", "Camera Service", "FAIL", createCamRes.statusCode, createCamRes.body);
      }
    }

    // 4.3 Get Created Camera by ID
    if (createdCameraId) {
      const getCamRes = await request(8892, `/api/v1/cameras/${createdCameraId}`, "GET", undefined, adminToken);
      recordResult(`Get Camera by ID (/api/v1/cameras/${createdCameraId})`, "Camera Service", getCamRes.statusCode === 200 ? "PASS" : "FAIL", getCamRes.statusCode, getCamRes.body);

      // 4.4 Get Camera Streams
      const streamsRes = await request(8892, `/api/v1/cameras/${createdCameraId}/streams`, "GET", undefined, adminToken);
      recordResult(`Get Camera Streams (/api/v1/cameras/${createdCameraId}/streams)`, "Camera Service", streamsRes.statusCode === 200 ? "PASS" : "FAIL", streamsRes.statusCode, streamsRes.body);
    }
  } catch (err: any) {
    recordResult("Camera Service Workflow", "Camera Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. INCIDENT SERVICE APIS (:8893)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 5. INCIDENT SERVICE APIS (:8893) ---");
  let createdIncidentId: string = "";

  try {
    // 5.1 List Incidents
    const incListRes = await request(8893, "/api/v1/incidents", "GET", undefined, adminToken);
    recordResult("List Incidents (/api/v1/incidents)", "Incident Service", incListRes.statusCode === 200 ? "PASS" : "FAIL", incListRes.statusCode, incListRes.body);

    // 5.2 Create Real Incident Linked to Site & Camera
    if (createdSiteId && createdCameraId) {
      const createIncRes = await request(
        8893,
        "/api/v1/incidents",
        "POST",
        {
          siteId: createdSiteId,
          cameraId: createdCameraId,
          violationType: "NO_HELMET",
          severity: "HIGH",
          detectedAt: new Date().toISOString(),
        },
        adminToken,
      );
      if (createIncRes.statusCode === 201 || createIncRes.statusCode === 200) {
        const parsed = JSON.parse(createIncRes.body);
        createdIncidentId = parsed.data?.id;
        recordResult("Create Incident (POST /api/v1/incidents)", "Incident Service", "PASS", createIncRes.statusCode, `Created incident ID: ${createdIncidentId}`);
      } else {
        recordResult("Create Incident (POST /api/v1/incidents)", "Incident Service", "FAIL", createIncRes.statusCode, createIncRes.body);
      }
    }

    // 5.3 Get Created Incident by ID
    if (createdIncidentId) {
      const getIncRes = await request(8893, `/api/v1/incidents/${createdIncidentId}`, "GET", undefined, adminToken);
      recordResult(`Get Incident by ID (/api/v1/incidents/${createdIncidentId})`, "Incident Service", getIncRes.statusCode === 200 ? "PASS" : "FAIL", getIncRes.statusCode, getIncRes.body);
    }

    // 5.4 List Evidences
    const evidencesRes = await request(8893, "/api/v1/evidences", "GET", undefined, adminToken);
    recordResult("List Evidences (/api/v1/evidences)", "Incident Service", evidencesRes.statusCode === 200 ? "PASS" : "FAIL", evidencesRes.statusCode, evidencesRes.body);
  } catch (err: any) {
    recordResult("Incident Service Workflow", "Incident Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. MEDIA SERVICE APIS (:8890)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 6. MEDIA SERVICE APIS (:8890) ---");
  try {
    // 6.1 List Files
    const filesRes = await request(8890, "/api/v1/files", "GET", undefined, adminToken);
    recordResult("List Files (/api/v1/files)", "Media Service", filesRes.statusCode === 200 ? "PASS" : "FAIL", filesRes.statusCode, filesRes.body);

    // 6.2 Request Presigned Upload URL with valid schema
    const uploadUrlRes = await request(
      8890,
      "/api/v1/files/upload-url",
      "POST",
      {
        fileName: "violation_snapshot.jpg",
        mimeType: "image/jpeg",
        size: 204800,
        folder: "incidents",
        isPublic: false,
      },
      adminToken,
    );
    recordResult("Request Presigned Upload URL (POST /api/v1/files/upload-url)", "Media Service", uploadUrlRes.statusCode === 200 || uploadUrlRes.statusCode === 201 ? "PASS" : "FAIL", uploadUrlRes.statusCode, uploadUrlRes.body);
  } catch (err: any) {
    recordResult("Media Service Workflow", "Media Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. REPORTING SERVICE APIS (:8894)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 7. REPORTING SERVICE APIS (:8894) ---");
  try {
    // 7.1 Summary Statistics
    const statsRes = await request(8894, "/api/v1/statistics/summary", "GET", undefined, adminToken);
    recordResult("Statistics Summary (/api/v1/statistics/summary)", "Reporting Service", statsRes.statusCode === 200 ? "PASS" : "FAIL", statsRes.statusCode, statsRes.body);

    // 7.2 Trends Statistics
    const trendsRes = await request(8894, "/api/v1/statistics/trends", "GET", undefined, adminToken);
    recordResult("Statistics Trends (/api/v1/statistics/trends)", "Reporting Service", trendsRes.statusCode === 200 ? "PASS" : "FAIL", trendsRes.statusCode, trendsRes.body);

    // 7.3 Violation Distribution
    const violRes = await request(8894, "/api/v1/statistics/by-violation", "GET", undefined, adminToken);
    recordResult("Statistics By Violation (/api/v1/statistics/by-violation)", "Reporting Service", violRes.statusCode === 200 ? "PASS" : "FAIL", violRes.statusCode, violRes.body);

    // 7.4 Camera Rankings
    const camStatsRes = await request(8894, "/api/v1/statistics/by-camera", "GET", undefined, adminToken);
    recordResult("Statistics By Camera (/api/v1/statistics/by-camera)", "Reporting Service", camStatsRes.statusCode === 200 ? "PASS" : "FAIL", camStatsRes.statusCode, camStatsRes.body);

    // 7.5 Report Templates
    const templatesRes = await request(8894, "/api/v1/reports/templates", "GET", undefined, adminToken);
    recordResult("Report Templates (/api/v1/reports/templates)", "Reporting Service", templatesRes.statusCode === 200 ? "PASS" : "FAIL", templatesRes.statusCode, templatesRes.body);

    // 7.6 Report History
    const reportsRes = await request(8894, "/api/v1/reports/history", "GET", undefined, adminToken);
    recordResult("Report History (/api/v1/reports/history)", "Reporting Service", reportsRes.statusCode === 200 ? "PASS" : "FAIL", reportsRes.statusCode, reportsRes.body);

    // 7.7 List AI Models
    const aiModelsRes = await request(8894, "/api/v1/ai-models", "GET", undefined, adminToken);
    recordResult("List AI Models (/api/v1/ai-models)", "Reporting Service", aiModelsRes.statusCode === 200 ? "PASS" : "FAIL", aiModelsRes.statusCode, aiModelsRes.body);
  } catch (err: any) {
    recordResult("Reporting Service Workflow", "Reporting Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. NOTIFICATION SERVICE APIS (:8889)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- 8. NOTIFICATION SERVICE APIS (:8889) ---");
  try {
    // 8.1 List Notifications
    const notifsRes = await request(8889, "/api/v1/notifications", "GET", undefined, adminToken);
    recordResult("List Notifications (/api/v1/notifications)", "Notification Service", notifsRes.statusCode === 200 ? "PASS" : "FAIL", notifsRes.statusCode, notifsRes.body);
  } catch (err: any) {
    recordResult("Notification Service Workflow", "Notification Service", "FAIL", undefined, undefined, err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n==========================================================================================");
  console.log("📊 COMPREHENSIVE TEST EXECUTION SUMMARY");
  console.log("==========================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total APIs Tested: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    console.log("❌ FAILED STEPS DETAILS:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((f) => {
        console.log(`  - [${f.service}] ${f.step} | HTTP: ${f.httpCode || "ERR"} | Info: ${f.snippet || f.error}`);
      });
  } else {
    console.log("🎉 ALL 43 APIS ACROSS ALL 7 MICROSERVICES PASSED PERFECTLY (100% SUCCESS)!");
  }
  console.log("==========================================================================================");
}

runComprehensiveTests().catch(console.error);
