import http from "http";

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

async function runDeepTests() {
  console.log("===============================================================================");
  console.log("🔬 RUNNING DEEP SCENARIOS: AUTH BYPASS, RBAC CHECKS, DETAIL APIS, EDGE CASES");
  console.log("===============================================================================\n");

  // 1. Auth Bypass Testing (No token -> expect 401)
  console.log("--- TEST 1: UNAUTHENTICATED ACCESS PROTECTION ---");
  const unauthRes = await request({
    hostname: "localhost",
    port: 8891,
    path: "/api/v1/sites",
    method: "GET",
  });
  if (unauthRes.statusCode === 401) {
    console.log(`✅ [Site Service] Correctly rejected unauthenticated request: HTTP 401`);
  } else {
    console.error(`❌ [Site Service] Unexpected status for unauthenticated request: HTTP ${unauthRes.statusCode}`);
  }

  // 2. Tampered JWT Testing (Invalid signature -> expect 401)
  console.log("\n--- TEST 2: TAMPERED JWT SIGNATURE REJECTION ---");
  const tamperedRes = await request({
    hostname: "localhost",
    port: 8892,
    path: "/api/v1/cameras",
    method: "GET",
    headers: {
      Authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature",
    },
  });
  if (tamperedRes.statusCode === 401) {
    console.log(`✅ [Camera Service] Correctly rejected fake/tampered token: HTTP 401`);
  } else {
    console.error(`❌ [Camera Service] Failed to reject invalid token: HTTP ${tamperedRes.statusCode}`);
  }

  // 3. Login as Admin to get valid token
  console.log("\n--- TEST 3: ADMIN LOGIN & RETRIEVE ENTITIES ---");
  const adminLoginPayload = JSON.stringify({ email: "admin@template.local", password: "Admin@123456" });
  const adminLoginRes = await request(
    {
      hostname: "localhost",
      port: 9999,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(adminLoginPayload) },
    },
    adminLoginPayload
  );
  const adminToken = JSON.parse(adminLoginRes.body).data.accessToken;

  // 4. Retrieve single Site and Zones by Site ID
  console.log("\n--- TEST 4: SITE SERVICE DETAILED ENDPOINTS ---");
  const sitesRes = await request({
    hostname: "localhost",
    port: 8891,
    path: "/api/v1/sites",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const sitesList = JSON.parse(sitesRes.body).data;
  const firstSite = sitesList[0];
  console.log(`Site retrieved: ID=${firstSite.id}, Name="${firstSite.name}", Code="${firstSite.code}"`);

  const singleSiteRes = await request({
    hostname: "localhost",
    port: 8891,
    path: `/api/v1/sites/${firstSite.id}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (singleSiteRes.statusCode === 200) {
    console.log(`✅ [Site Service] GET /api/v1/sites/:id responded 200 OK`);
  } else {
    console.error(`❌ [Site Service] GET /api/v1/sites/:id returned HTTP ${singleSiteRes.statusCode}`);
  }

  // 5. Retrieve Camera details
  console.log("\n--- TEST 5: CAMERA SERVICE DETAILED ENDPOINTS ---");
  const camerasRes = await request({
    hostname: "localhost",
    port: 8892,
    path: "/api/v1/cameras",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const camerasList = JSON.parse(camerasRes.body).data;
  const firstCam = camerasList[0];
  console.log(`Camera retrieved: ID=${firstCam.id}, Name="${firstCam.name}", RTSP="${firstCam.rtspUrl?.slice(0, 25)}..."`);

  const singleCamRes = await request({
    hostname: "localhost",
    port: 8892,
    path: `/api/v1/cameras/${firstCam.id}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (singleCamRes.statusCode === 200) {
    console.log(`✅ [Camera Service] GET /api/v1/cameras/:id responded 200 OK`);
  } else {
    console.error(`❌ [Camera Service] GET /api/v1/cameras/:id returned HTTP ${singleCamRes.statusCode}`);
  }

  // 6. Retrieve Incident details
  console.log("\n--- TEST 6: INCIDENT SERVICE DETAILED ENDPOINTS ---");
  const incidentsRes = await request({
    hostname: "localhost",
    port: 8893,
    path: "/api/v1/incidents",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const incidentsList = JSON.parse(incidentsRes.body).data;
  const firstInc = incidentsList[0];
  console.log(`Incident retrieved: ID=${firstInc.id}, Type="${firstInc.violationType}", Status="${firstInc.status}"`);

  const singleIncRes = await request({
    hostname: "localhost",
    port: 8893,
    path: `/api/v1/incidents/${firstInc.id}`,
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (singleIncRes.statusCode === 200) {
    console.log(`✅ [Incident Service] GET /api/v1/incidents/:id responded 200 OK`);
  } else {
    console.error(`❌ [Incident Service] GET /api/v1/incidents/:id returned HTTP ${singleIncRes.statusCode}`);
  }

  // 7. Reporting Analytics Endpoints
  console.log("\n--- TEST 7: REPORTING SERVICE ANALYTICS & TRENDS ---");
  const trendsRes = await request({
    hostname: "localhost",
    port: 8894,
    path: "/api/v1/statistics/trends",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`[Reporting Service] GET /api/v1/statistics/trends status: ${trendsRes.statusCode}`);

  const aiMetricsRes = await request({
    hostname: "localhost",
    port: 8894,
    path: "/api/v1/statistics/ai-performance",
    method: "GET",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  console.log(`[Reporting Service] GET /api/v1/statistics/ai-performance status: ${aiMetricsRes.statusCode}`);

  // 8. Test RBAC Restriction (Login as normal USER with no admin rights)
  console.log("\n--- TEST 8: RBAC RESTRICTION ON STANDARD USER ---");
  const userLoginPayload = JSON.stringify({ email: "user@template.local", password: "User@123456" });
  const userLoginRes = await request(
    {
      hostname: "localhost",
      port: 9999,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(userLoginPayload) },
    },
    userLoginPayload
  );
  if (userLoginRes.statusCode === 200) {
    const userToken = JSON.parse(userLoginRes.body).data.accessToken;
    // Standard user tries to create a new site -> should return 403 Forbidden
    const createSitePayload = JSON.stringify({ name: "Unauthorized Site", code: "UNAUTH_001" });
    const forbidRes = await request(
      {
        hostname: "localhost",
        port: 8891,
        path: "/api/v1/sites",
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(createSitePayload),
        },
      },
      createSitePayload
    );

    if (forbidRes.statusCode === 403) {
      console.log(`✅ [RBAC Security] Normal user blocked from creating Site: HTTP 403 Forbidden`);
    } else {
      console.warn(`⚠️ [RBAC Security] Normal user POST /api/v1/sites returned HTTP ${forbidRes.statusCode}: ${forbidRes.body}`);
    }
  }

  console.log("\n===============================================================================");
  console.log("🏁 ALL DEEP TESTS COMPLETED!");
  console.log("===============================================================================\n");
}

runDeepTests().catch(console.error);
