import http from "http";

interface TestResult {
  step: string;
  target: string;
  status: "PASS" | "FAIL";
  httpCode?: number;
  dataSnippet?: string;
  error?: string;
}

const results: TestResult[] = [];

function request(options: http.RequestOptions, postData?: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log("===============================================================================");
  console.log("🚀 STARTING MICROSERVICES INTEGRATION TEST (REAL DATA & REAL ENDPOINTS)");
  console.log("===============================================================================\n");

  // PHASE 1: Health Checks for all 7 Microservices
  const healthTargets = [
    { name: "Identity Service", port: 9999, path: "/api/v1/health" },
    { name: "Notification Service", port: 8889, path: "/health" },
    { name: "Media Service", port: 8890, path: "/health" },
    { name: "Site Service", port: 8891, path: "/health" },
    { name: "Camera Service", port: 8892, path: "/health" },
    { name: "Incident Service", port: 8893, path: "/health" },
    { name: "Reporting Service", port: 8894, path: "/health" },
  ];

  console.log("--- PHASE 1: HEALTH CHECKS ---");
  for (const target of healthTargets) {
    try {
      const res = await request({
        hostname: "localhost",
        port: target.port,
        path: target.path,
        method: "GET",
        timeout: 4000,
      });

      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ [${target.name} :${target.port}] UP (HTTP ${res.statusCode}): ${res.body.trim().slice(0, 80)}`);
        results.push({
          step: "Health Check",
          target: `${target.name} (port ${target.port})`,
          status: "PASS",
          httpCode: res.statusCode,
          dataSnippet: res.body.trim().slice(0, 100),
        });
      } else {
        console.error(`❌ [${target.name} :${target.port}] BAD STATUS (HTTP ${res.statusCode}): ${res.body}`);
        results.push({
          step: "Health Check",
          target: `${target.name} (port ${target.port})`,
          status: "FAIL",
          httpCode: res.statusCode,
          error: res.body,
        });
      }
    } catch (err: any) {
      console.error(`❌ [${target.name} :${target.port}] UNREACHABLE: ${err.message}`);
      results.push({
        step: "Health Check",
        target: `${target.name} (port ${target.port})`,
        status: "FAIL",
        error: err.message,
      });
    }
  }

  // PHASE 2: Identity Login & JWKS Endpoint
  console.log("\n--- PHASE 2: IDENTITY AUTHENTICATION & JWKS ---");
  let accessToken = "";
  try {
    const loginPayload = JSON.stringify({
      email: "admin@template.local",
      password: "Admin@123456",
    });

    const loginRes = await request(
      {
        hostname: "localhost",
        port: 9999,
        path: "/api/v1/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(loginPayload),
        },
      },
      loginPayload
    );

    if (loginRes.statusCode === 200) {
      const parsed = JSON.parse(loginRes.body);
      accessToken = parsed.data?.accessToken || parsed.accessToken;
      console.log(`✅ [Identity Login] Success! Logged in as Admin. Token length: ${accessToken?.length || 0}`);
      results.push({
        step: "Identity Login",
        target: "Identity Service (:9999/api/v1/auth/login)",
        status: "PASS",
        httpCode: loginRes.statusCode,
        dataSnippet: `User: ${parsed.data?.user?.email || "admin"}, Role: ${parsed.data?.user?.role?.name || "ADMIN"}`,
      });
    } else {
      console.error(`❌ [Identity Login] Failed (HTTP ${loginRes.statusCode}): ${loginRes.body}`);
      results.push({
        step: "Identity Login",
        target: "Identity Service (:9999/api/v1/auth/login)",
        status: "FAIL",
        httpCode: loginRes.statusCode,
        error: loginRes.body,
      });
    }
  } catch (err: any) {
    console.error(`❌ [Identity Login] Error: ${err.message}`);
    results.push({
      step: "Identity Login",
      target: "Identity Service (:9999/api/v1/auth/login)",
      status: "FAIL",
      error: err.message,
    });
  }

  // Verify JWKS endpoint
  try {
    const jwksRes = await request({
      hostname: "localhost",
      port: 9999,
      path: "/.well-known/jwks.json",
      method: "GET",
    });
    if (jwksRes.statusCode === 200) {
      const parsed = JSON.parse(jwksRes.body);
      console.log(`✅ [Identity JWKS] RFC 7517 Key Set exposed: ${parsed.keys?.length || 0} key(s) found`);
      results.push({
        step: "JWKS Discovery",
        target: "Identity Service (:9999/.well-known/jwks.json)",
        status: "PASS",
        httpCode: jwksRes.statusCode,
        dataSnippet: `Found ${parsed.keys?.length} keys (kid: ${parsed.keys?.[0]?.kid})`,
      });
    } else {
      console.error(`❌ [Identity JWKS] Failed: HTTP ${jwksRes.statusCode}`);
      results.push({
        step: "JWKS Discovery",
        target: "Identity Service (:9999/.well-known/jwks.json)",
        status: "FAIL",
        httpCode: jwksRes.statusCode,
      });
    }
  } catch (err: any) {
    console.error(`❌ [Identity JWKS] Error: ${err.message}`);
  }

  if (!accessToken) {
    console.error("\n⛔ CANNOT CONTINUE SATELLITE TESTS WITHOUT ACCESS TOKEN!");
    printSummary();
    return;
  }

  // PHASE 3: Satellite Services Interoperability & Authorization
  console.log("\n--- PHASE 3: SATELLITE SERVICES QUERY WITH REAL JWT TOKEN ---");
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const satelliteEndpoints = [
    {
      name: "Site Service",
      port: 8891,
      path: "/api/v1/sites",
      description: "List Construction Sites",
    },
    {
      name: "Site Service (Zones)",
      port: 8891,
      path: "/api/v1/zones",
      description: "List Work Zones",
    },
    {
      name: "Camera Service",
      port: 8892,
      path: "/api/v1/cameras",
      description: "List Surveillance Cameras",
    },
    {
      name: "Incident Service",
      port: 8893,
      path: "/api/v1/incidents",
      description: "List PPE Violations & Incidents",
    },
    {
      name: "Reporting Service",
      port: 8894,
      path: "/api/v1/statistics/summary",
      description: "KPI Dashboard & Violation Summary",
    },
    {
      name: "Reporting Service (Templates)",
      port: 8894,
      path: "/api/v1/reports/templates",
      description: "Report Templates List",
    },
    {
      name: "Notification Service",
      port: 8889,
      path: "/api/v1/notifications",
      description: "User Notifications List",
    },
  ];

  for (const ep of satelliteEndpoints) {
    try {
      const res = await request({
        hostname: "localhost",
        port: ep.port,
        path: ep.path,
        method: "GET",
        headers: authHeaders,
        timeout: 5000,
      });

      if (res.statusCode >= 200 && res.statusCode < 300) {
        let snippet = res.body.trim();
        try {
          const parsed = JSON.parse(res.body);
          if (Array.isArray(parsed.data)) {
            snippet = `Array of ${parsed.data.length} items`;
          } else if (parsed.data?.items) {
            snippet = `Paginated items: ${parsed.data.items.length}, total: ${parsed.data.meta?.totalItems ?? parsed.data.total}`;
          } else if (parsed.data) {
            snippet = JSON.stringify(parsed.data).slice(0, 100);
          }
        } catch {
          snippet = snippet.slice(0, 100);
        }

        console.log(`✅ [${ep.name} :${ep.port}${ep.path}] HTTP ${res.statusCode} -> ${snippet}`);
        results.push({
          step: "Cross-Service API Call",
          target: `${ep.name} (${ep.path})`,
          status: "PASS",
          httpCode: res.statusCode,
          dataSnippet: snippet,
        });
      } else {
        console.error(`❌ [${ep.name} :${ep.port}${ep.path}] HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`);
        results.push({
          step: "Cross-Service API Call",
          target: `${ep.name} (${ep.path})`,
          status: "FAIL",
          httpCode: res.statusCode,
          error: res.body.slice(0, 250),
        });
      }
    } catch (err: any) {
      console.error(`❌ [${ep.name} :${ep.port}${ep.path}] Error: ${err.message}`);
      results.push({
        step: "Cross-Service API Call",
        target: `${ep.name} (${ep.path})`,
        status: "FAIL",
        error: err.message,
      });
    }
  }

  printSummary();
}

function printSummary() {
  console.log("\n===============================================================================");
  console.log("📊 TEST EXECUTION SUMMARY");
  console.log("===============================================================================");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Steps Tested: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅ PASS" : "❌ FAIL";
    console.log(`${icon} | [${r.step}] ${r.target}`);
    if (r.dataSnippet) console.log(`       Data: ${r.dataSnippet}`);
    if (r.error) console.log(`       Error: ${r.error}`);
  }
  console.log("===============================================================================\n");
}

runTests().catch(console.error);
