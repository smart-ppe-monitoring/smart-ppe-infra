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

async function verify() {
  console.log("===============================================================================");
  console.log("🧪 TESTING ROLE-BASED ACCESS CONTROL & MEDIA SERVICE SATELLITE RESOLUTION");
  console.log("===============================================================================\n");

  // 1. Login as SAFETY MANAGER
  console.log("1. Logging in as Safety Manager (manager@ppe.local)...");
  const mgrPayload = JSON.stringify({ email: "manager@ppe.local", password: "Manager@123456" });
  const mgrLoginRes = await request(
    {
      hostname: "localhost",
      port: 9999,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(mgrPayload) },
    },
    mgrPayload
  );

  const mgrToken = JSON.parse(mgrLoginRes.body).data.accessToken;
  console.log(`   Logged in! Token obtained.`);

  // 2. Safety Manager calling Site Service (:8891/api/v1/sites) -> Should succeed (HTTP 200)
  console.log("2. Safety Manager calling Site Service (GET :8891/api/v1/sites)...");
  const siteRes = await request({
    hostname: "localhost",
    port: 8891,
    path: "/api/v1/sites",
    method: "GET",
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  console.log(`   Status: HTTP ${siteRes.statusCode}`);
  if (siteRes.statusCode === 200) {
    console.log(`   ✅ SUCCESS: Safety Manager granted access to Sites! Items count: ${JSON.parse(siteRes.body).data?.length}`);
  } else {
    console.error(`   ❌ FAILED: ${siteRes.body}`);
  }

  // 3. Safety Manager calling Camera Service (:8892/api/v1/cameras) -> Should succeed (HTTP 200)
  console.log("\n3. Safety Manager calling Camera Service (GET :8892/api/v1/cameras)...");
  const camRes = await request({
    hostname: "localhost",
    port: 8892,
    path: "/api/v1/cameras",
    method: "GET",
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  console.log(`   Status: HTTP ${camRes.statusCode}`);
  if (camRes.statusCode === 200) {
    console.log(`   ✅ SUCCESS: Safety Manager granted access to Cameras! Items count: ${JSON.parse(camRes.body).data?.length}`);
  } else {
    console.error(`   ❌ FAILED: ${camRes.body}`);
  }

  // 4. Safety Manager calling Incident Service (:8893/api/v1/incidents) -> Should succeed (HTTP 200)
  console.log("\n4. Safety Manager calling Incident Service (GET :8893/api/v1/incidents)...");
  const incRes = await request({
    hostname: "localhost",
    port: 8893,
    path: "/api/v1/incidents",
    method: "GET",
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  console.log(`   Status: HTTP ${incRes.statusCode}`);
  if (incRes.statusCode === 200) {
    console.log(`   ✅ SUCCESS: Safety Manager granted access to Incidents! Items count: ${JSON.parse(incRes.body).data?.length}`);
  } else {
    console.error(`   ❌ FAILED: ${incRes.body}`);
  }

  // 5. Admin calling Media Service (:8890/api/v1/files/upload-url)
  console.log("\n5. Admin calling Media Service (POST :8890/api/v1/files/upload-url)...");
  const adminPayload = JSON.stringify({ email: "admin@template.local", password: "Admin@123456" });
  const adminLoginRes = await request(
    {
      hostname: "localhost",
      port: 9999,
      path: "/api/v1/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(adminPayload) },
    },
    adminPayload
  );
  const adminToken = JSON.parse(adminLoginRes.body).data.accessToken;

  const uploadReqPayload = JSON.stringify({
    fileName: "snapshot_incident_test.jpg",
    mimeType: "image/jpeg",
    size: 2048,
    category: "EVIDENCE",
  });

  const uploadRes = await request(
    {
      hostname: "localhost",
      port: 8890,
      path: "/api/v1/files/upload-url",
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(uploadReqPayload),
      },
    },
    uploadReqPayload
  );

  console.log(`   Status: HTTP ${uploadRes.statusCode}`);
  if (uploadRes.statusCode === 200 || uploadRes.statusCode === 201) {
    console.log(`   ✅ SUCCESS: Admin generated presigned upload URL!`);
    const parsed = JSON.parse(uploadRes.body);
    console.log(`   Upload URL generated for key: ${parsed.data?.key || parsed.data?.fileId || "generated"}`);
  } else {
    console.error(`   ❌ FAILED: ${uploadRes.body}`);
  }

  console.log("\n===============================================================================");
  console.log("🏁 VERIFICATION COMPLETE!");
  console.log("===============================================================================\n");
}

verify().catch(console.error);
