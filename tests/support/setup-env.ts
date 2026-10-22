// Deterministic, fake environment for tests. Tests never talk to Atlas (docs/11 §3).
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/teleshop-test?replicaSet=rs0";
process.env.MONGODB_DB ??= "teleshop-test";
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.TOTP_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3100";
