process.env.MEMORY_MODE = "fake";
process.env.DB_DRIVER = process.env.TEST_DATABASE_URL ? "pg" : "pglite";
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET = "test-session-secret";
process.env.DELEGATE_KEY_SECRET = "test-delegate-secret";
delete process.env.NEBIUS_API_KEY;
delete process.env.TATUM_API_KEY;
